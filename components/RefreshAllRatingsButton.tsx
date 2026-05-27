'use client'

import { useState } from 'react'

export default function RefreshAllRatingsButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [count, setCount] = useState(0)

  async function refresh() {
    setState('loading')
    const res = await fetch('/api/admin/shows/refresh-all-ratings', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCount(data.updated)
      setState('done')
    } else {
      setState('error')
    }
    setTimeout(() => setState('idle'), 4000)
  }

  return (
    <button onClick={refresh} disabled={state === 'loading'} className="btn-secondary text-sm">
      {state === 'loading' && 'Načítám hodnocení...'}
      {state === 'done' && `✓ Aktualizováno ${count} seriálů`}
      {state === 'error' && 'Chyba'}
      {state === 'idle' && '↻ Refresh hodnocení (vše)'}
    </button>
  )
}
