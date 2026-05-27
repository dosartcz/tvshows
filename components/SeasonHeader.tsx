'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface Props {
  seasonLabel: string
  episodeCount: number
  episodeIds: number[]
  initialWatchedIds: number[]
}

export default function SeasonHeader({ seasonLabel, episodeCount, episodeIds, initialWatchedIds }: Props) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set(initialWatchedIds))
  const [loading, setLoading] = useState(false)

  const watchedCount = episodeIds.filter(id => watchedIds.has(id)).length
  const total = episodeIds.length
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const allWatched = total > 0 && watchedCount === total

  async function toggleSeason(e: React.MouseEvent) {
    e.stopPropagation()
    if (loading || total === 0) return
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
      if (!res.ok) setWatchedIds(new Set(initialWatchedIds))
    } catch {
      setWatchedIds(new Set(initialWatchedIds))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {userId && total > 0 && (
        <span className="text-xs text-gray-500">{watchedCount}/{total} ({pct}%)</span>
      )}
      {userId && total > 0 && (
        <button
          onClick={toggleSeason}
          disabled={loading}
          title={allWatched ? 'Odznačit celou sezónu' : 'Označit celou sezónu jako zhlédnutou'}
          className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
            allWatched
              ? 'border-green-600 text-green-400 hover:bg-red-900/20 hover:border-red-600 hover:text-red-400'
              : 'border-gray-700 text-gray-500 hover:border-green-600 hover:text-green-400'
          }`}
        >
          {loading ? '...' : allWatched ? '✓ Vše zhlédnuto' : 'Označit vše'}
        </button>
      )}
      <span className="text-gray-500 text-sm">{episodeCount} epizod</span>
    </div>
  )
}
