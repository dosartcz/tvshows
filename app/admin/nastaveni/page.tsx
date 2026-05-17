'use client'

import { useState } from 'react'

export default function AdminNastaveniPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function fetchFeeds() {
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/fetch-feeds', { method: 'POST' })
    const data = await res.json()
    setResult(res.ok ? `Importováno ${data.count} nových článků.` : `Chyba: ${data.error}`)
    setLoading(false)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-8">Nastavení</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="font-semibold text-gray-200 mb-2">RSS Agregátor</h2>
        <p className="text-gray-500 text-sm mb-4">
          Ruční spuštění importu z RSS feedů (Variety, Deadline, Hollywood Reporter, Den of Geek).
          Automaticky probíhá každou hodinu přes Vercel Cron.
        </p>
        <button onClick={fetchFeeds} disabled={loading} className="btn-primary">
          {loading ? 'Importuji...' : 'Importovat RSS nyní'}
        </button>
        {result && (
          <p className={`mt-3 text-sm ${result.startsWith('Chyba') ? 'text-red-400' : 'text-green-400'}`}>
            {result}
          </p>
        )}
      </div>
    </div>
  )
}
