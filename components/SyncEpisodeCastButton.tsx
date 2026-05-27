'use client'
import { useState } from 'react'

export default function SyncEpisodeCastButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [showId, setShowId] = useState('')

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = {}
      if (showId.trim()) body.show_id = parseInt(showId.trim())
      const res = await fetch('/api/admin/tmdb/sync-episode-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setResult(`Synced: ${data.synced}, errors: ${data.errors}, total: ${data.total}`)
    } catch {
      setResult('Chyba')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="show_id (volitelné)"
        value={showId}
        onChange={e => setShowId(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 w-36"
      />
      <button onClick={sync} disabled={loading} className="btn-secondary text-xs px-3 py-1.5">
        {loading ? 'Načítám...' : 'Sync obsazení epizod'}
      </button>
      {result && <span className="text-xs text-gray-400">{result}</span>}
    </div>
  )
}
