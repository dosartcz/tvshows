'use client'

import { useState, useEffect } from 'react'

const CATEGORY_OPTIONS = [
  { value: 'recaps',        label: 'Recaps (rekapitulace epizod)' },
  { value: 'recap',         label: 'Recap' },
  { value: 'lists',         label: 'Žebříčky (lists, rankings)' },
  { value: 'what to watch', label: 'What to Watch / Stream' },
  { value: 'television',    label: 'Television (obecné, bez seriálu)' },
  { value: 'interviews',    label: 'Rozhovory (interviews)' },
  { value: 'videos',        label: 'Videa / klipy' },
  { value: 'photos',        label: 'Fotogalerie' },
]

function parseCats(str: string): string[] {
  return (str || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

function CatCheckboxes({ sourceId, current, onSave }: {
  sourceId: number
  current: string
  onSave: (id: number, cats: string) => void
}) {
  const [selected, setSelected] = useState<string[]>(() => parseCats(current))

  function toggle(value: string) {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      <p className="text-xs text-gray-500 mb-2">Vyloučit kategorie:</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {CATEGORY_OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="accent-accent w-3.5 h-3.5"
            />
            <span className={`text-xs transition-colors ${selected.includes(opt.value) ? 'text-accent' : 'text-gray-400 group-hover:text-gray-300'}`}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={() => onSave(sourceId, selected.join(','))}
        className="btn-primary text-xs px-3 py-1"
      >
        Uložit filtr
      </button>
    </div>
  )
}

export default function AdminRssPage() {
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [expandedFilter, setExpandedFilter] = useState<number | null>(null)

  async function load() {
    const res = await fetch('/api/admin/rss')
    setSources(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addSource() {
    if (!newName || !newUrl) return
    await fetch('/api/admin/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', name: newName, url: newUrl }),
    })
    setNewName('')
    setNewUrl('')
    load()
  }

  async function deleteSource(id: number) {
    await fetch('/api/admin/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
    load()
  }

  async function saveCats(id: number, cats: string) {
    await fetch('/api/admin/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, excluded_categories: cats }),
    })
    setExpandedFilter(null)
    load()
  }

  async function toggleSource(id: number, active: boolean) {
    await fetch('/api/admin/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id, active }),
    })
    load()
  }

  async function sync() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/admin/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' }),
    })
    setSyncResult(await res.json())
    setSyncing(false)
    load()
  }

  if (loading) return <div className="text-gray-500">Načítám...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">RSS zdroje</h1>
        <button onClick={sync} disabled={syncing} className="btn-primary text-sm">
          {syncing ? 'Importuji...' : '↻ Spustit import'}
        </button>
      </div>

      {syncResult && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm">
          <p className="text-green-400">Importováno: {syncResult.imported}</p>
          <p className="text-gray-400">Přeskočeno: {syncResult.skipped}</p>
          {syncResult.errors?.length > 0 && (
            <div className="mt-2 text-red-400">
              {syncResult.errors.map((e: string, i: number) => <p key={i}>{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Přidat zdroj */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Přidat zdroj</h2>
        <div className="flex gap-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Název (např. TVLine)"
            className="input flex-1"
          />
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="RSS URL"
            className="input flex-[2]"
          />
          <button onClick={addSource} className="btn-primary text-sm px-4">Přidat</button>
        </div>
      </div>

      {/* Seznam zdrojů */}
      <div className="space-y-3">
        {sources.map((s: any) => {
          const activeCats = parseCats(s.excluded_categories)
          return (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.url}</p>
                  {s.last_fetched_at && (
                    <p className="text-xs text-gray-600 mt-1">
                      Naposledy: {new Date(s.last_fetched_at).toLocaleString('cs-CZ')}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {activeCats.length > 0
                      ? activeCats.map(c => (
                          <span key={c} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{c}</span>
                        ))
                      : <span className="text-xs text-gray-600">Bez filtru</span>
                    }
                    <button
                      onClick={() => setExpandedFilter(expandedFilter === s.id ? null : s.id)}
                      className="text-xs text-accent hover:text-accent-hover ml-1"
                    >
                      {expandedFilter === s.id ? 'Zavřít' : 'Upravit filtr'}
                    </button>
                  </div>
                  {expandedFilter === s.id && (
                    <CatCheckboxes
                      sourceId={s.id}
                      current={s.excluded_categories ?? ''}
                      onSave={saveCats}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => toggleSource(s.id, !s.active)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      s.active
                        ? 'border-green-700 text-green-400 hover:bg-green-900/30'
                        : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                    }`}
                  >
                    {s.active ? 'Aktivní' : 'Neaktivní'}
                  </button>
                  <button
                    onClick={() => deleteSource(s.id)}
                    className="text-xs text-accent-hover hover:text-accent"
                  >
                    Smazat
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {sources.length === 0 && (
          <p className="text-gray-500 text-center py-8">Žádné RSS zdroje. Přidej první.</p>
        )}
      </div>
    </div>
  )
}
