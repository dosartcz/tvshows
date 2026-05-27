'use client'

import { useState } from 'react'

export default function SyncAllPeopleButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [info, setInfo] = useState('')

  async function sync() {
    setState('loading')
    const res = await fetch('/api/admin/people/sync-all', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setInfo(`${data.updated} z ${data.total}`)
      setState('done')
    } else {
      setState('error')
    }
    setTimeout(() => setState('idle'), 5000)
  }

  return (
    <button onClick={sync} disabled={state === 'loading'} className="btn-secondary text-sm">
      {state === 'loading' && 'Načítám info herců...'}
      {state === 'done' && `✓ Doplněno ${info} herců`}
      {state === 'error' && 'Chyba'}
      {state === 'idle' && '↻ Doplnit info herců'}
    </button>
  )
}
