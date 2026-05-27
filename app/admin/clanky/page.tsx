'use client'

import { useState, useEffect } from 'react'

export default function AdminClankyPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [shows, setShows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/articles').then(r => r.json()),
      fetch('/api/admin/shows').then(r => r.json()),
    ]).then(([a, s]) => {
      setArticles(a)
      setShows(s)
      setLoading(false)
    })
  }, [])

  async function deleteArticle(id: number) {
    if (!confirm('Smazat aktualitu?')) return
    await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' })
    setArticles(prev => prev.filter((a: any) => a.id !== id))
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  async function assign(articleId: number, showId: number) {
    await fetch(`/api/admin/articles/${articleId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_id: showId }),
    })
    const res = await fetch('/api/admin/articles')
    setArticles(await res.json())
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(selected.size === articles.length ? new Set() : new Set(articles.map((a: any) => a.id)))
  }

  async function bulkDelete() {
    if (!confirm(`Smazat ${selected.size} aktualit?`)) return
    setBulkDeleting(true)
    await fetch('/api/admin/articles/bulk-delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setArticles(prev => prev.filter((a: any) => !selected.has(a.id)))
    setSelected(new Set())
    setBulkDeleting(false)
  }

  if (loading) return <div className="text-gray-500">Načítám...</div>

  const allChecked = articles.length > 0 && selected.size === articles.length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Aktuality ({articles.length})</h1>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg">
          <span className="text-sm text-gray-300">Vybráno: <strong className="text-white">{selected.size}</strong></span>
          <button
            onClick={bulkDelete}
            disabled={bulkDeleting}
            className="ml-auto btn-danger text-xs px-3 py-1.5"
          >
            {bulkDeleting ? 'Mažu...' : 'Smazat vybrané'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-300">
            Zrušit výběr
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 px-1">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          className="rounded border-gray-600 bg-gray-800 text-accent cursor-pointer"
        />
        <span className="text-xs text-gray-500">Vybrat vše</span>
      </div>

      <div className="space-y-3">
        {articles.map((a: any) => (
          <div
            key={a.id}
            className={`bg-gray-900 border rounded-lg p-4 transition-colors ${selected.has(a.id) ? 'border-gray-600 bg-gray-800/50' : 'border-gray-800'}`}
          >
            <div className="flex gap-3 items-start">
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() => toggle(a.id)}
                className="mt-1 rounded border-gray-600 bg-gray-800 text-accent cursor-pointer flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-100 hover:text-accent line-clamp-1">
                  {a.title}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{a.source}</span>
                  {a.published_at && (
                    <span className="text-xs text-gray-600">{new Date(a.published_at).toLocaleDateString('cs-CZ')}</span>
                  )}
                </div>
                {a.show_titles && (
                  <p className="text-xs text-accent-dark mt-1">Přiřazeno: {a.show_titles}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  className="input text-xs w-48"
                  defaultValue=""
                  onChange={e => e.target.value && assign(a.id, Number(e.target.value))}
                >
                  <option value="">Přiřadit k seriálu...</option>
                  {shows.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => deleteArticle(a.id)}
                  className="btn-danger text-xs px-3 py-2"
                >
                  Smazat
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
