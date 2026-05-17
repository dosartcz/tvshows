'use client'

import { useState, useEffect } from 'react'

export default function AdminClankyPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [shows, setShows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  async function assign(articleId: number, showId: number) {
    await fetch(`/api/admin/articles/${articleId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_id: showId }),
    })
    const res = await fetch('/api/admin/articles')
    setArticles(await res.json())
  }

  if (loading) return <div className="text-gray-500">Načítám...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Články ({articles.length})</h1>

      <div className="space-y-3">
        {articles.map((a: any) => (
          <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-100 hover:text-amber-400 line-clamp-1">
                  {a.title}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{a.source}</span>
                  {a.published_at && (
                    <span className="text-xs text-gray-600">{new Date(a.published_at).toLocaleDateString('cs-CZ')}</span>
                  )}
                </div>
                {a.show_titles && (
                  <p className="text-xs text-amber-600 mt-1">Přiřazeno: {a.show_titles}</p>
                )}
              </div>
              <div className="flex-shrink-0">
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
