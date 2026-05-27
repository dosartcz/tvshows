'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/lib/auth-modal'

interface Props {
  allEpisodeIds: number[]
  initialWatchedIds: number[]
  variant?: 'default' | 'wide'
  showId?: number
  initialInWatchlist?: boolean
}

export default function MarkAllWatchedButton({ allEpisodeIds, initialWatchedIds, variant = 'default', showId, initialInWatchlist = false }: Props) {
  const { data: session } = useSession()
  const { openAuthModal } = useAuthModal()
  const [loading, setLoading] = useState(false)
  const [watchedSet, setWatchedSet] = useState<Set<number>>(() => new Set(initialWatchedIds))
  const wasInWatchlist = useRef(initialInWatchlist)
  const removedFromWatchlist = useRef(false)

  const allIds = new Set(allEpisodeIds)
  const allWatched = allEpisodeIds.length > 0 && allEpisodeIds.every(id => watchedSet.has(id))
  const isLoggedIn = !!(session?.user as any)?.id

  useEffect(() => {
    function onToggle(e: Event) {
      const { episodeId, watched } = (e as CustomEvent).detail
      if (!allIds.has(episodeId)) return
      setWatchedSet(prev => {
        const next = new Set(prev)
        watched ? next.add(episodeId) : next.delete(episodeId)
        const nowAll = allEpisodeIds.length > 0 && allEpisodeIds.every(id => next.has(id))
        window.dispatchEvent(new CustomEvent('all-watched-change', { detail: { allWatched: nowAll } }))
        return next
      })
    }
    window.addEventListener('episode-toggle', onToggle)
    return () => window.removeEventListener('episode-toggle', onToggle)
  }, [allEpisodeIds])

  async function toggle() {
    if (!isLoggedIn) { openAuthModal(); return }
    if (loading || allEpisodeIds.length === 0) return
    const markWatched = !allWatched
    setLoading(true)
    try {
      const res = await fetch('/api/user/episodes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_ids: allEpisodeIds, watched: markWatched }),
      })
      if (res.ok) {
        const next = markWatched ? new Set(allEpisodeIds) : new Set<number>()
        setWatchedSet(next)
        window.dispatchEvent(new CustomEvent('mark-all-watched', { detail: { ids: allEpisodeIds, watched: markWatched } }))
        window.dispatchEvent(new CustomEvent('all-watched-change', { detail: { allWatched: markWatched } }))
        window.dispatchEvent(new Event('episode-watched'))
        // Watchlist sync
        if (showId) {
          if (markWatched) {
            // Vždy zkusit odebrat ze watchlistu, zapamatovat výsledek
            const wlRes = await fetch('/api/user/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ show_id: showId, add: false }),
            })
            if (wlRes.ok) {
              removedFromWatchlist.current = true
              window.dispatchEvent(new Event('watchlist-change'))
            }
          } else if (!markWatched && removedFromWatchlist.current) {
            // Vrátit do watchlistu jen pokud jsme ho předtím odebrali
            await fetch('/api/user/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ show_id: showId, add: true }),
            })
            removedFromWatchlist.current = false
            window.dispatchEvent(new Event('watchlist-change'))
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (allEpisodeIds.length === 0) return null

  if (variant === 'wide') {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
          allWatched && isLoggedIn ? 'text-accent hover:text-red-400' : 'text-gray-500 hover:text-accent'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs font-medium">{loading ? '...' : 'Zhlédnuto'}</span>
      </button>
    )
  }

  if (allWatched) {
    return (
      <span className="text-sm text-accent flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Vše zhlédnuto
      </span>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="btn-secondary text-sm disabled:opacity-50"
    >
      {loading ? '...' : 'Označit vše jako zhlédnuté'}
    </button>
  )
}
