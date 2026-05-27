'use client'
import { useState } from 'react'

export default function SyncLogosButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/shows/sync-logos', { method: 'POST' })
      const data = await res.json()
      setResult(`Synced: ${data.synced}`)
    } catch {
      setResult('Chyba')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={sync} disabled={loading} className="btn-secondary text-xs px-3 py-1.5">
        {loading ? 'Načítám...' : 'Sync loga'}
      </button>
      {result && <span className="text-xs text-gray-400">{result}</span>}
    </div>
  )
}
