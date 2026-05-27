'use client'

import { useState } from 'react'

export default function SyncGenresButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function sync() {
    setState('loading')
    const res = await fetch('/api/admin/shows/sync-genres', { method: 'POST' })
    setState(res.ok ? 'done' : 'error')
    setTimeout(() => setState('idle'), 4000)
  }

  return (
    <button onClick={sync} disabled={state === 'loading'} className="btn-secondary text-sm">
      {state === 'loading' && 'Načítám žánry...'}
      {state === 'done' && '✓ Žánry synchronizovány'}
      {state === 'error' && 'Chyba'}
      {state === 'idle' && '↻ Sync žánrů'}
    </button>
  )
}
