'use client'

import { useState } from 'react'

export default function SyncTrailersButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function sync() {
    setState('loading')
    const res = await fetch('/api/admin/shows/sync-trailers', { method: 'POST' })
    setState(res.ok ? 'done' : 'error')
    setTimeout(() => setState('idle'), 4000)
  }

  return (
    <button onClick={sync} disabled={state === 'loading'} className="btn-secondary text-sm">
      {state === 'loading' && 'Načítám trailery...'}
      {state === 'done' && '✓ Trailery synchronizovány'}
      {state === 'error' && 'Chyba'}
      {state === 'idle' && '↻ Sync trailerů'}
    </button>
  )
}
