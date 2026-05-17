'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function PridatHercePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<number | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch(`/api/admin/tmdb/import-person?q=${encodeURIComponent(query)}`)
    setResults(await res.json())
    setLoading(false)
  }

  async function importPerson(tmdb_id: number) {
    setImporting(tmdb_id)
    const res = await fetch('/api/admin/tmdb/import-person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id }),
    })
    const data = await res.json()
    if (data.id) router.push(`/admin/herci/${data.id}`)
    setImporting(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Přidat herce / tvůrce</h1>

      <div className="flex gap-3 mb-8">
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Hledat na TMDb..." className="input max-w-md" />
        <button onClick={search} disabled={loading} className="btn-primary">
          {loading ? 'Hledám...' : 'Hledat'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map(r => (
            <div key={r.tmdb_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col items-center text-center gap-3">
              {r.photo_url && (
                <Image src={r.photo_url} alt={r.name} width={80} height={80} className="rounded-full object-cover object-top" />
              )}
              <p className="font-medium text-gray-100 text-sm">{r.name}</p>
              <button onClick={() => importPerson(r.tmdb_id)} disabled={importing === r.tmdb_id}
                className="btn-primary text-xs py-1.5 w-full">
                {importing === r.tmdb_id ? 'Importuji...' : 'Importovat'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
