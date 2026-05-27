'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface Props {
  episodeIds: number[]
  initialWatchedIds: number[]
  onUpdate?: (watchedIds: number[]) => void
}

export default function SeasonWatchButton({ episodeIds, initialWatchedIds, onUpdate }: Props) {
  const { data: session } = useSession()
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set(initialWatchedIds))
  const [loading, setLoading] = useState(false)

  if (!(session?.user as any)?.id) return null

  const allWatched = episodeIds.length > 0 && episodeIds.every(id => watchedIds.has(id))

  async function toggleSeason() {
    if (loading || episodeIds.length === 0) return
    const markWatched = !allWatched
    const newSet = new Set(watchedIds)
    if (markWatched) {
      episodeIds.forEach(id => newSet.add(id))
    } else {
      episodeIds.forEach(id => newSet.delete(id))
    }
    setWatchedIds(newSet)
    setLoading(true)
    try {
      const res = await fetch('/api/user/episodes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_ids: episodeIds, watched: markWatched }),
      })
      if (!res.ok) {
        // revert
        setWatchedIds(new Set(initialWatchedIds))
      } else {
        onUpdate?.(Array.from(newSet))
      }
    } catch {
      setWatchedIds(new Set(initialWatchedIds))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); toggleSeason() }}
      disabled={loading || episodeIds.length === 0}
      title={allWatched ? 'Odznačit celou sezónu' : 'Označit celou sezónu jako zhlédnutou'}
      className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
        allWatched
          ? 'border-green-600 text-green-400 hover:bg-red-900/20 hover:border-red-600 hover:text-red-400'
          : 'border-gray-700 text-gray-500 hover:border-green-600 hover:text-green-400'
      }`}
    >
      {loading ? '...' : allWatched ? '✓ Vše zhlédnuto' : 'Označit vše'}
    </button>
  )
}
