'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/lib/auth-modal'

interface Props {
  showId: number
  initialInList: boolean
  initialAllWatched?: boolean
  variant?: 'default' | 'wide'
}

export default function WatchlistButton({ showId, initialInList, initialAllWatched = false, variant = 'default' }: Props) {
  const { data: session } = useSession()
  const { openAuthModal } = useAuthModal()
  const [inList, setInList] = useState(initialInList)
  const [loading, setLoading] = useState(false)
  const [allWatched, setAllWatched] = useState(initialAllWatched)

  const isLoggedIn = !!(session?.user as any)?.id

  useEffect(() => {
    function onAllWatchedChange(e: Event) {
      setAllWatched((e as CustomEvent).detail.allWatched)
    }
    window.addEventListener('all-watched-change', onAllWatchedChange)
    return () => window.removeEventListener('all-watched-change', onAllWatchedChange)
  }, [])

  async function toggle() {
    if (!isLoggedIn) { openAuthModal(); return }
    if (loading) return
    const newState = !inList
    setInList(newState)
    setLoading(true)
    try {
      const res = await fetch('/api/user/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_id: showId, add: newState }),
      })
      if (res.ok) window.dispatchEvent(new Event('watchlist-change'))
    } catch {
      setInList(!newState)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'wide') {
    if (allWatched && isLoggedIn) return null
    const active = inList && isLoggedIn
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
          active ? 'text-accent hover:text-red-400' : 'text-gray-500 hover:text-accent'
        }`}
      >
        {active ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
          </svg>
        )}
        <span className="text-xs font-medium">{loading ? '...' : 'Seznam'}</span>
      </button>
    )
  }

  if (allWatched && isLoggedIn) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`btn text-sm ${inList && isLoggedIn ? 'btn-primary' : 'btn-secondary'}`}
    >
      {inList && isLoggedIn ? '✓ V seznamu' : '+ Přidat do seznamu'}
    </button>
  )
}
