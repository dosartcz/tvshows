'use client'

import { useState } from 'react'

export default function BulkTranslatePeopleButton() {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<{ translated: number; skipped: number; total: number; errors: string[] } | null>(null)

  async function run() {
    setState('running')
    setResult(null)
    const res = await fetch('/api/admin/translate/bulk-people', { method: 'POST' })
    const data = await res.json()
    setResult(data)
    setState('done')
  }

  return (
    <div className="flex flex-col gap-1">
      <button onClick={run} disabled={state === 'running'} className="btn-secondary text-sm">
        {state === 'running' ? 'Načítám...' : 'TMDB překlady bio herců'}
      </button>
      {result && (
        <p className="text-xs text-gray-500">
          Přeloženo {result.translated}, bez CS {result.skipped} / {result.total}
          {result.errors.length > 0 && <span className="text-red-400"> · {result.errors.length} chyb</span>}
        </p>
      )}
    </div>
  )
}
