'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/lib/auth-modal'

interface Props {
  episodeId: number
  initialWatched: boolean
  airDate?: string | null
  variant?: 'icon' | 'wide'
}

export default function EpisodeWatchButton({ episodeId, initialWatched, airDate, variant = 'icon' }: Props) {
  const { data: session } = useSession()
  const { openAuthModal } = useAuthModal()
  const [watched, setWatched] = useState(initialWatched)
  const [loading, setLoading] = useState(false)

  const isLoggedIn = !!(session?.user as any)?.id
  const hasAired = airDate ? new Date(airDate) <= new Date() : false

  // Skrýt tlačítko pokud epizoda ještě nevysílala a není označená
  if (!hasAired && !watched) return null

  async function toggle() {
    if (!isLoggedIn) { openAuthModal(); return }
    if (loading) return
    const newWatched = !watched
    setWatched(newWatched)
    setLoading(true)
    try {
      const res = await fetch('/api/user/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: episodeId, watched: newWatched }),
      })
      if (!res.ok) setWatched(!newWatched)
      else window.dispatchEvent(new Event('episode-watched'))
    } catch {
      setWatched(!newWatched)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'wide') {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title={!isLoggedIn ? 'Přihlaste se' : watched && isLoggedIn ? 'Označit jako nezhlédnuté' : 'Označit jako zhlédnuté'}
        className={`w-full flex items-center justify-center gap-2 py-3 transition-colors ${
          watched && isLoggedIn
            ? 'text-accent hover:text-red-400'
            : 'text-gray-500 hover:text-accent'
        }`}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium">{loading ? '...' : 'Zhlédnuto'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={!isLoggedIn ? 'Přihlaste se' : watched ? 'Označit jako nezhlédnuté' : 'Označit jako zhlédnuté'}
      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
        watched && isLoggedIn
          ? 'bg-accent border-accent text-gray-950'
          : 'border-gray-600 text-gray-600 hover:border-accent hover:text-accent'
      }`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </button>
  )
}
