'use client'

import { useState, useRef, useEffect } from 'react'
import SeasonRow from './SeasonRow'

interface Episode {
  id: number
  episode_number: number
  title: string | null
  description: string | null
  air_date: string | null
  runtime: number | null
  still_url: string | null
  vote_average: number | null
  vote_count: number | null
}

interface Season {
  id: number
  season_number: number
  name: string | null
  episode_count: number
}

interface Props {
  showId: number
  showSlug: string
  seasons: Season[]
  episodesBySeasonId: Record<number, Episode[]>
  guestStarsByEpisodeId: Record<number, any[]>
  initialWatchedIds: number[]
  initialRating: number | null
}

const ThumbDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
  </svg>
)
const Check = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
)
const ThumbUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
  </svg>
)

const ratingOptions = [
  { value: -1, label: 'Nelíbí se mi', icon: <ThumbDown /> },
  { value: 0,  label: 'OK',           icon: <Check /> },
  { value: 1,  label: 'Líbí se mi',   icon: <ThumbUp /> },
]

export default function ShowEpisodesTracker({
  showId, showSlug, seasons, episodesBySeasonId, guestStarsByEpisodeId, initialWatchedIds, initialRating
}: Props) {
  const allEpisodeIds = seasons.flatMap(s => (episodesBySeasonId[s.id] ?? []).map(e => e.id))
  const totalEpisodes = allEpisodeIds.length

  const [seasonWatched, setSeasonWatched] = useState<Record<number, Set<number>>>(() => {
    const initial = new Set(initialWatchedIds)
    const map: Record<number, Set<number>> = {}
    for (const s of seasons) {
      const eps = episodesBySeasonId[s.id] ?? []
      map[s.id] = new Set(eps.map(e => e.id).filter(id => initial.has(id)))
    }
    return map
  })

  const [showPopup, setShowPopup] = useState(false)
  const [syncKey, setSyncKey] = useState(0)
  const [rating, setRating] = useState<number | null>(initialRating)
  const [ratingLoading, setRatingLoading] = useState(false)
  const wasCompleted = useRef(
    initialWatchedIds.length >= totalEpisodes && totalEpisodes > 0
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const { watched } = (e as CustomEvent).detail
      const newWatched: Record<number, Set<number>> = {}
      for (const s of seasons) {
        const eps = episodesBySeasonId[s.id] ?? []
        newWatched[s.id] = watched ? new Set(eps.map((e: any) => e.id)) : new Set()
      }
      setSeasonWatched(newWatched)
      setSyncKey(k => k + 1)
      if (watched && !wasCompleted.current && totalEpisodes > 0 && rating === null) {
        setShowPopup(true)
      }
      wasCompleted.current = watched
    }
    window.addEventListener('mark-all-watched', handler)
    return () => window.removeEventListener('mark-all-watched', handler)
  }, [seasons, episodesBySeasonId, totalEpisodes])

  const totalWatched = Object.values(seasonWatched).reduce((sum, s) => sum + s.size, 0)
  const isCompleted = totalEpisodes > 0 && totalWatched >= totalEpisodes

  function handleWatchedChange(seasonId: number, newSet: Set<number>) {
    setSeasonWatched(prev => {
      const next = { ...prev, [seasonId]: newSet }
      const newTotal = Object.values(next).reduce((sum, s) => sum + s.size, 0)
      const nowCompleted = totalEpisodes > 0 && newTotal >= totalEpisodes
      if (nowCompleted && !wasCompleted.current && rating === null) {
        setShowPopup(true)
      }
      wasCompleted.current = nowCompleted
      return next
    })
  }

  async function rate(value: number) {
    if (ratingLoading) return
    const newRating = rating === value ? null : value
    setRating(newRating)
    window.dispatchEvent(new CustomEvent('user-rating-updated', { detail: newRating }))
    if (newRating !== null) setShowPopup(false)
    setRatingLoading(true)
    try {
      await fetch('/api/user/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_id: showId, rating: newRating }),
      })
    } catch {
      setRating(rating)
      window.dispatchEvent(new CustomEvent('user-rating-updated', { detail: rating }))
    } finally {
      setRatingLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {seasons.map(season => {
          const eps = episodesBySeasonId[season.id] ?? []
          const guestMap: Record<number, any[]> = {}
          eps.forEach(ep => {
            const guests = guestStarsByEpisodeId[ep.id]
            if (guests) guestMap[ep.id] = guests
          })
          return (
            <SeasonRow
              key={season.id}
              showSlug={showSlug}
              season={season}
              episodes={eps}
              guestStars={guestMap}
              initialWatchedIds={Array.from(seasonWatched[season.id] ?? [])}
              syncKey={syncKey}
              onWatchedChange={handleWatchedChange}
            />
          )
        })}
        {seasons.length === 0 && <p className="text-gray-500 text-center py-8">Žádné epizody.</p>}
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPopup(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <p className="text-2xl mb-2">🎉</p>
            <h3 className="text-lg font-bold text-white mb-1">Seriál dokončen!</h3>
            <p className="text-sm text-gray-400 mb-6">Jak se ti líbil?</p>
            <div className="flex justify-center gap-3">
              {ratingOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => rate(opt.value)}
                  disabled={ratingLoading}
                  title={opt.label}
                  className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                    rating === opt.value
                      ? 'bg-accent border-accent text-gray-950'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Přeskočit
            </button>
          </div>
        </div>
      )}
    </>
  )
}
