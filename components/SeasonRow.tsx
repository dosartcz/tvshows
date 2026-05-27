'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthModal } from '@/lib/auth-modal'

interface Episode {
  id: number
  episode_number: number
  title: string | null
  description: string | null
  description_cs: string | null
  air_date: string | null
  runtime: number | null
  still_url: string | null
  vote_average: number | null
  vote_count: number | null
}

interface GuestStar {
  id: number
  name: string
  slug: string
  photo_url: string | null
  character_name: string | null
}

interface Props {
  showSlug: string
  season: {
    id: number
    season_number: number
    name: string | null
    episode_count: number
  }
  episodes: Episode[]
  guestStars: Record<number, GuestStar[]>
  initialWatchedIds: number[]
  syncKey?: number
  onWatchedChange?: (seasonId: number, watchedIds: Set<number>) => void
}

export default function SeasonRow({ showSlug, season, episodes, guestStars, initialWatchedIds, syncKey, onWatchedChange }: Props) {
  const { data: session } = useSession()
  const { openAuthModal } = useAuthModal()
  const userId = (session?.user as any)?.id
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set(initialWatchedIds))

  useEffect(() => {
    if (syncKey === undefined || syncKey === 0) return
    setWatchedIds(new Set(initialWatchedIds))
  }, [syncKey])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [epLoading, setEpLoading] = useState<Set<number>>(new Set())

  const watchedCount = episodes.filter(ep => watchedIds.has(ep.id)).length
  const total = episodes.length
  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0
  const allWatched = total > 0 && watchedCount === total

  async function toggleSeason(e: React.MouseEvent) {
    e.stopPropagation()
    if (bulkLoading || total === 0) return
    const markWatched = !allWatched
    const now = new Date()
    // Při označování jako zhlédnuté přeskočit epizody, které ještě nebyly odvysílány
    // Epizody bez air_date (typicky specials) považujeme za odvysílané
    const eligibleEps = markWatched
      ? episodes.filter(ep => !ep.air_date || new Date(ep.air_date) <= now)
      : episodes
    if (eligibleEps.length === 0) return
    const newSet = new Set(watchedIds)
    eligibleEps.forEach(ep => markWatched ? newSet.add(ep.id) : newSet.delete(ep.id))
    setWatchedIds(newSet)
    onWatchedChange?.(season.id, newSet)
    setBulkLoading(true)
    try {
      const res = await fetch('/api/user/episodes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_ids: eligibleEps.map(ep => ep.id), watched: markWatched }),
      })
      if (!res.ok) { setWatchedIds(new Set(initialWatchedIds)); onWatchedChange?.(season.id, new Set(initialWatchedIds)) }
      else {
        window.dispatchEvent(new Event('episode-watched'))
        eligibleEps.forEach(ep => {
          window.dispatchEvent(new CustomEvent('episode-toggle', { detail: { episodeId: ep.id, watched: markWatched } }))
        })
      }
    } catch {
      setWatchedIds(new Set(initialWatchedIds)); onWatchedChange?.(season.id, new Set(initialWatchedIds))
    } finally {
      setBulkLoading(false)
    }
  }

  async function toggleEpisode(episodeId: number) {
    if (epLoading.has(episodeId)) return
    const newWatched = !watchedIds.has(episodeId)
    const newSet = new Set(watchedIds)
    newWatched ? newSet.add(episodeId) : newSet.delete(episodeId)
    setWatchedIds(newSet)
    onWatchedChange?.(season.id, newSet)
    setEpLoading(prev => new Set(prev).add(episodeId))
    try {
      const res = await fetch('/api/user/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: episodeId, watched: newWatched }),
      })
      if (!res.ok) {
        const revert = new Set(watchedIds)
        setWatchedIds(revert)
        onWatchedChange?.(season.id, revert)
      } else {
        window.dispatchEvent(new Event('episode-watched'))
        window.dispatchEvent(new CustomEvent('episode-toggle', { detail: { episodeId, watched: newWatched } }))
      }
    } catch {
      const revert = new Set(watchedIds)
      setWatchedIds(revert)
      onWatchedChange?.(season.id, revert)
    } finally {
      setEpLoading(prev => { const s = new Set(prev); s.delete(episodeId); return s })
    }
  }

  return (
    <details className="bg-gray-900 rounded-lg border border-gray-800">
      <summary className="px-4 py-3 cursor-pointer font-semibold text-gray-200 hover:text-white flex items-center justify-between">
        <span>{season.name || `Sezóna ${season.season_number}`}</span>
        <div className="flex items-center gap-3">
          {userId && total > 0 && (
            <span className="text-xs text-gray-500">{watchedCount}/{total} ({pct}%)</span>
          )}
          {total > 0 && (userId ? (
            <button
              onClick={toggleSeason}
              disabled={bulkLoading}
              title={allWatched ? 'Odznačit celou sezónu' : 'Označit celou sezónu jako zhlédnutou'}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                allWatched
                  ? 'border-green-600 text-green-400 hover:bg-red-900/20 hover:border-red-600 hover:text-red-400'
                  : 'border-gray-700 text-gray-500 hover:border-green-600 hover:text-green-400'
              }`}
            >
              {bulkLoading ? '...' : allWatched ? '✓ Zhlédnuto' : 'Zhlédnuto'}
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); openAuthModal() }}
              title="Přihlaste se pro označení sezóny"
              className="text-xs px-2 py-1 rounded-lg border border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400 transition-colors"
            >
              Zhlédnuto
            </button>
          ))}
          <span className="text-gray-500 text-sm">{season.episode_count} epizod</span>
        </div>
      </summary>

      <div className="divide-y divide-gray-800 border-t border-gray-800">
        {episodes.map(ep => {
          const guests = guestStars[ep.id] ?? []
          const watched = watchedIds.has(ep.id)
          const loading = epLoading.has(ep.id)
          // Epizody bez air_date (specials) považujeme za odvysílané
          const hasAired = ep.air_date ? new Date(ep.air_date) <= new Date() : true
          const showWatchBtn = hasAired || watched
          const episodeUrl = `/serialy/${showSlug}/sezona/${season.season_number}/epizoda/${ep.episode_number}`
          return (
            <div key={ep.id} className="px-4 py-3 flex items-center gap-3">
              {/* Fotka */}
              <Link href={episodeUrl} className="relative w-28 h-16 rounded overflow-hidden bg-gray-800 shrink-0 hover:opacity-80 transition-opacity">
                {ep.still_url
                  ? <Image src={ep.still_url} alt={ep.title ?? ''} fill className="object-cover" />
                  : <div className="absolute inset-0 bg-gray-800" />
                }
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={episodeUrl} className="text-sm font-medium text-gray-200 hover:text-accent transition-colors line-clamp-1">
                  <span className="text-gray-500 mr-1.5">{ep.episode_number}.</span>{ep.title}
                </Link>
                {(ep.description_cs || ep.description) && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{ep.description_cs || ep.description}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  {ep.vote_average != null && (
                    <span className="text-xs text-yellow-500">★ {ep.vote_average.toFixed(1)}</span>
                  )}
                  {ep.runtime && <span className="text-xs text-gray-500">{ep.runtime} min</span>}
                  {ep.air_date && <span className="text-xs text-gray-500">{new Date(ep.air_date).toLocaleDateString('cs-CZ')}</span>}
                </div>
              </div>

              {/* Watch button — jen pro vysílané epizody (nebo omylem označené) */}
              {showWatchBtn && (userId ? (
                <button
                  onClick={() => toggleEpisode(ep.id)}
                  disabled={loading}
                  title={watched ? 'Označit jako nezhlédnuté' : 'Označit jako zhlédnuté'}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    watched
                      ? 'bg-accent border-accent text-gray-950'
                      : 'border-gray-600 text-gray-600 hover:border-accent hover:text-accent'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={openAuthModal}
                  title="Přihlaste se"
                  className="w-7 h-7 rounded-full border-2 border-gray-700 flex items-center justify-center text-gray-600 hover:border-gray-500 hover:text-gray-400 transition-colors shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </details>
  )
}
