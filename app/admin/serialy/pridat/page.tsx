'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface TmdbResult {
  tmdb_id: number
  title: string
  first_air_date?: string
  poster_url?: string
  overview?: string
}

export default function PridatSerialPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbResult[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<number | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch(`/api/admin/tmdb/search?q=${encodeURIComponent(query)}`)
    setResults(await res.json())
    setLoading(false)
  }

  async function importShow(tmdb_id: number) {
    setImporting(tmdb_id)
    const res = await fetch('/api/admin/tmdb/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id }),
    })
    const data = await res.json()
    if (data.id) router.push(`/admin/serialy/${data.id}`)
    setImporting(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Přidat seriál</h1>

      <div className="flex gap-3 mb-8">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Hledat na TMDb..."
          className="input max-w-md"
        />
        <button onClick={search} disabled={loading} className="btn-primary">
          {loading ? 'Hledám...' : 'Hledat'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(r => (
            <div key={r.tmdb_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex gap-4">
              {r.poster_url && (
                <Image src={r.poster_url} alt={r.title} width={60} height={90} className="rounded object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-100 line-clamp-1">{r.title}</p>
                <p className="text-gray-500 text-xs mb-2">
                  {r.first_air_date ? new Date(r.first_air_date).getFullYear() : 'N/A'} · TMDb #{r.tmdb_id}
                </p>
                {r.overview && <p className="text-gray-500 text-xs line-clamp-2 mb-3">{r.overview}</p>}
                <button
                  onClick={() => importShow(r.tmdb_id)}
                  disabled={importing === r.tmdb_id}
                  className="btn-primary text-xs py-1.5"
                >
                  {importing === r.tmdb_id ? 'Importuji...' : 'Importovat'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
