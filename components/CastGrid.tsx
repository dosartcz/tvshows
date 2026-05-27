'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import PersonPlaceholder from '@/components/PersonPlaceholder'

interface EpisodeEntry {
  id: number
  season_number: number
  episode_number: number
  title: string | null
  air_date: string | null
  character_name: string | null
  role: string | null
}

interface Props {
  people: any[]
  label: string
  limit?: number
  showId?: number
  showSlug?: string
}

export default function CastGrid({ people, label, limit = 18, showId, showSlug }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [modal, setModal] = useState<{ person: any; episodes: EpisodeEntry[] | null } | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [activeSeason, setActiveSeason] = useState<number | null>(null)

  const visible = showAll ? people : people.slice(0, limit)
  const remaining = people.length - limit

  async function openEpisodes(e: React.MouseEvent, person: any) {
    e.preventDefault()
    if (!showId) return
    setLoadingId(person.id)
    const res = await fetch(`/api/shows/${showId}/person/${person.id}/episodes`)
    const data: EpisodeEntry[] = res.ok ? await res.json() : []
    setModal({ person, episodes: data })
    // Výchozí sezóna = první dostupná
    const firstSeason = data.length > 0 ? data[0].season_number : null
    setActiveSeason(firstSeason)
    setLoadingId(null)
  }

  // Dostupné sezóny
  const seasons = modal?.episodes
    ? [...new Set(modal.episodes.map(ep => ep.season_number))].sort((a, b) => a - b)
    : []

  // Epizody aktivní sezóny — seskupit duplicity (stejná epizoda, různé role)
  const activeEpisodesRaw = modal?.episodes?.filter(ep => ep.season_number === activeSeason) ?? []
  const activeEpisodesMap = new Map<number, EpisodeEntry & { roles: string[] }>()
  for (const ep of activeEpisodesRaw) {
    if (!activeEpisodesMap.has(ep.id)) {
      activeEpisodesMap.set(ep.id, { ...ep, roles: [] })
    }
    const entry = activeEpisodesMap.get(ep.id)!
    const label = ep.character_name || (ep.role ? ep.role.charAt(0).toUpperCase() + ep.role.slice(1) : null)
    if (label && !entry.roles.includes(label)) entry.roles.push(label)
  }
  const activeEpisodes = [...activeEpisodesMap.values()]

  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">{label}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((p: any) => (
            <Link
              key={`${p.id}-${p.role}`}
              href={`/herci/${p.slug}`}
              className="group flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800/50 transition-colors"
            >
              <div className="relative w-16 h-[96px] rounded-lg overflow-hidden bg-gray-800 shrink-0">
                {p.photo_url ? (
                  <Image src={p.photo_url} alt={p.name} fill className="object-cover object-top" sizes="64px" />
                ) : (
                  <PersonPlaceholder />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-200 group-hover:text-accent transition-colors truncate">{p.name}</p>
                {p.character_name && <p className="text-xs text-gray-500 truncate">{p.character_name}</p>}
                {!p.character_name && p.role && <p className="text-xs text-gray-500 truncate capitalize">{p.role}</p>}
                {p.episode_count != null && showId && (
                  <button
                    onClick={(e) => openEpisodes(e, p)}
                    className="text-xs text-gray-600 hover:text-accent transition-colors"
                  >
                    {loadingId === p.id ? '...' : `${p.episode_count} epizod`}
                  </button>
                )}
                {p.episode_count != null && !showId && (
                  <p className="text-xs text-gray-600">{p.episode_count} epizod</p>
                )}
              </div>
            </Link>
          ))}
        </div>
        {!showAll && remaining > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-6 w-full py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
          >
            Zobrazit dalších {remaining} osob
          </button>
        )}
        {showAll && people.length > limit && (
          <button
            onClick={() => setShowAll(false)}
            className="mt-6 w-full py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
          >
            Skrýt
          </button>
        )}
      </div>

      {/* Modal s epizodami */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">{modal.person.name}</h2>
                <p className="text-xs text-gray-500">{modal.episodes ? new Set(modal.episodes.map(e => e.id)).size : 0} epizod</p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Season tabs */}
            {seasons.length > 1 && (
              <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-gray-800 shrink-0 overflow-x-auto">
                {seasons.map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveSeason(s)}
                    className={`shrink-0 w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      activeSeason === s
                        ? 'bg-accent text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Epizody */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
              {activeEpisodes.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Žádné epizody nenalezeny</p>
              )}
              {activeEpisodes.map(ep => {
                const year = ep.air_date ? ep.air_date.slice(0, 4) : null
                const href = showSlug
                  ? `/serialy/${showSlug}/sezona/${ep.season_number}/epizoda/${ep.episode_number}`
                  : null
                const content = (
                  <div className="px-5 py-3">
                    <p className="text-sm font-semibold text-white">
                      S{ep.season_number}.E{String(ep.episode_number).padStart(2, '0')}
                      {ep.title && <> · {ep.title}</>}
                      {year && <span className="font-normal text-gray-500"> ({year})</span>}
                    </p>
                    {ep.roles.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">{ep.roles.join(' · ')}</p>
                    )}
                  </div>
                )
                return href ? (
                  <Link
                    key={ep.id}
                    href={href}
                    onClick={() => setModal(null)}
                    className="block hover:bg-gray-800/50 transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={ep.id}>{content}</div>
                )
              })}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
