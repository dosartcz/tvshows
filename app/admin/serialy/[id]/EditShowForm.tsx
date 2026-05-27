'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Franchise { id: number; name: string }
interface Show { id: number; title: string; slug: string; description: string | null; description_cs: string | null; rating_imdb: number | null; franchise_id: number | null; status: string | null; country: string | null; network: string | null }

interface Props { show: Show; franchises: Franchise[] }

export default function EditShowForm({ show: initialShow, franchises }: Props) {
  const router = useRouter()
  const [show, setShow] = useState(initialShow)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [syncingEps, setSyncingEps] = useState(false)
  const [syncingSpecials, setSyncingSpecials] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/admin/shows/${show.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: show.description,
        description_cs: show.description_cs,
        rating_imdb: show.rating_imdb ? Number(show.rating_imdb) : null,
        franchise_id: show.franchise_id ? Number(show.franchise_id) : null,
        status: show.status,
        country: show.country,
        network: show.network,
      }),
    })
    setSaving(false)
    if (res.ok) {
      router.refresh()
      setMsg('Uloženo!')
    } else {
      setMsg('Chyba.')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function translateDescription() {
    if (!show.description) return
    setTranslating(true)
    const res = await fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: show.description }),
    })
    const data = await res.json()
    if (data.translated) setShow({ ...show, description_cs: data.translated })
    setTranslating(false)
  }

  async function refreshRatings() {
    setRefreshing(true)
    const res = await fetch(`/api/admin/shows/${show.id}/ratings`, { method: 'POST' })
    setRefreshing(false)
    if (res.ok) {
      setMsg('Hodnocení aktualizováno!')
    } else {
      setMsg('Chyba při načítání hodnocení.')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function syncSpecials() {
    setSyncingSpecials(true)
    const res = await fetch(`/api/admin/shows/${show.id}/sync-specials`, { method: 'POST' })
    setSyncingSpecials(false)
    if (res.ok) {
      const data = await res.json()
      router.refresh()
      setMsg(`Speciály: importováno ${data.imported} epizod`)
    } else {
      setMsg('Chyba při sync speciálů.')
    }
    setTimeout(() => setMsg(''), 4000)
  }

  async function syncEpisodes() {
    setSyncingEps(true)
    const res = await fetch(`/api/admin/shows/${show.id}/sync-episodes`, { method: 'POST' })
    setSyncingEps(false)
    if (res.ok) {
      router.refresh()
      setMsg('Epizody synchronizovány!')
    } else {
      setMsg('Chyba při synchronizaci epizod.')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteShow() {
    if (!confirm(`Smazat "${show?.title}"?`)) return
    await fetch(`/api/admin/shows/${show.id}`, { method: 'DELETE' })
    router.refresh()
    router.push('/admin/serialy')
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">{show.title}</h1>
        <div className="flex gap-2">
          <Link href={`/admin/serialy/${show.id}/herci`} className="btn-secondary text-sm">Obsazení</Link>
          <Link href={`/serialy/${show.slug}`} target="_blank" className="btn-secondary text-sm">↗ Zobrazit</Link>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="label">Popis (EN)</label>
          <textarea
            value={show.description ?? ''}
            onChange={e => setShow({ ...show, description: e.target.value })}
            rows={4} className="input resize-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label !mb-0">Popis (CZ překlad)</label>
            <button
              onClick={translateDescription}
              disabled={translating || !show.description}
              className="text-xs text-accent hover:text-accent-hover disabled:opacity-40 transition-colors"
            >
              {translating ? 'Překládám...' : '✦ Přeložit z EN'}
            </button>
          </div>
          <textarea
            value={show.description_cs ?? ''}
            onChange={e => setShow({ ...show, description_cs: e.target.value })}
            rows={4} className="input resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Franchise</label>
            <select
              value={show.franchise_id ?? ''}
              onChange={e => setShow({ ...show, franchise_id: e.target.value ? Number(e.target.value) : null })}
              className="input"
            >
              <option value="">– Bez franchise –</option>
              {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={show.status ?? ''}
              onChange={e => setShow({ ...show, status: e.target.value })}
              className="input"
            >
              <option value="">–</option>
              <option value="Returning Series">Returning Series</option>
              <option value="Ended">Ended</option>
              <option value="Canceled">Canceled</option>
              <option value="In Production">In Production</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Země</label>
            <select
              value={show.country ?? ''}
              onChange={e => setShow({ ...show, country: e.target.value })}
              className="input"
            >
              <option value="">–</option>
              <option value="US">US</option>
              <option value="UK">UK</option>
            </select>
          </div>
          <div>
            <label className="label">Síť</label>
            <input
              value={show.network ?? ''}
              onChange={e => setShow({ ...show, network: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">IMDb rating</label>
            <input
              type="number" step="0.1" min="0" max="10"
              value={show.rating_imdb ?? ''}
              onChange={e => setShow({ ...show, rating_imdb: e.target.value ? Number(e.target.value) : null })}
              className="input"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Ukládám...' : 'Uložit'}
          </button>
          <button onClick={refreshRatings} disabled={refreshing} className="btn-secondary">
            {refreshing ? 'Načítám...' : '↻ Refresh hodnocení'}
          </button>
          <button onClick={syncEpisodes} disabled={syncingEps} className="btn-secondary">
            {syncingEps ? 'Synchronizuji...' : '↻ Sync epizody'}
          </button>
          <button onClick={syncSpecials} disabled={syncingSpecials} className="btn-secondary">
            {syncingSpecials ? 'Importuji...' : '↻ Sync speciály'}
          </button>
          {msg && <span className="text-sm text-green-400">{msg}</span>}
          <button onClick={deleteShow} className="btn-danger ml-auto">Smazat</button>
        </div>
      </div>
    </div>
  )
}
