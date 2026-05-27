'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/lib/auth-modal'
import Image from 'next/image'
import Link from 'next/link'
import PersonPlaceholder from '@/components/PersonPlaceholder'

interface Stats {
  episodes: number
  mins: number
  completed: number
  watching: number
  topDirector: { name: string; slug: string; photo_url: string | null; cnt: number } | null
  topWriter: { name: string; slug: string; photo_url: string | null; cnt: number } | null
  topActress: { name: string; slug: string; photo_url: string | null; cnt: number } | null
  topActor: { name: string; slug: string; photo_url: string | null; cnt: number } | null
  topActressVoice: { name: string; slug: string; photo_url: string | null; cnt: number } | null
  topActorVoice: { name: string; slug: string; photo_url: string | null; cnt: number } | null
}

interface WatchlistShow {
  id: number
  title: string
  slug: string
  poster_url: string | null
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  if (remainHours === 0) return `${days} dní`
  return `${days} dní ${remainHours} h`
}

export default function CommunitySidebar() {
  const { data: session } = useSession()
  const { openAuthModal } = useAuthModal()
  const isLoggedIn = !!(session?.user as any)?.id
  const userId = (session?.user as any)?.id ?? null
  const [stats, setStats] = useState<Stats | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistShow[] | null>(null)

  const fetchStats = useCallback(async () => {
    const url = isLoggedIn ? '/api/user/stats' : '/api/community-stats'
    const res = await fetch(url)
    if (res.ok) setStats(await res.json())
  }, [isLoggedIn])

  const fetchWatchlist = useCallback(async () => {
    const res = await fetch('/api/user/watchlist')
    if (res.ok) setWatchlist(await res.json())
  }, [])

  useEffect(() => {
    setStats(null)
    fetchStats()
    window.addEventListener('episode-watched', fetchStats)
    return () => window.removeEventListener('episode-watched', fetchStats)
  }, [fetchStats, userId])

  useEffect(() => {
    if (isLoggedIn) fetchWatchlist()
    else setWatchlist(null)
  }, [isLoggedIn, userId, fetchWatchlist])

  useEffect(() => {
    if (!isLoggedIn) return
    window.addEventListener('watchlist-change', fetchWatchlist)
    return () => window.removeEventListener('watchlist-change', fetchWatchlist)
  }, [isLoggedIn, fetchWatchlist])

  const statRows = stats ? [
    { label: 'Zhlédnutých epizod', value: stats.episodes.toLocaleString('cs-CZ') },
    { label: 'Dokoukaných seriálů', value: stats.completed.toLocaleString('cs-CZ') },
    { label: 'Rozkoukaných seriálů', value: stats.watching.toLocaleString('cs-CZ') },
    { label: 'Čas sledování', value: formatTime(stats.mins) },
  ] : null

  return (
    <div className="sticky top-20 space-y-3">

      {/* Uživatel / CTA */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
        {isLoggedIn ? (
          <Link href="/profil" className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-700 shrink-0 border border-gray-600">
              {((session?.user as any)?.avatarUrl || session?.user?.image)
                ? <Image src={(session?.user as any)?.avatarUrl ?? session!.user!.image!} alt={session?.user?.name ?? ''} fill className="object-cover object-top" />
                : <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                    {(session?.user?.name ?? session?.user?.email ?? '?')[0].toUpperCase()}
                  </div>
              }
            </div>
            <p className="text-sm font-medium text-white">{session?.user?.name ?? session?.user?.email}</p>
          </Link>
        ) : (
          <>
            <p className="text-sm text-gray-300 mb-3">Sleduj co koukáš a co tě ještě čeká</p>
            <button onClick={openAuthModal} className="btn-primary text-sm w-full">
              Přihlásit se
            </button>
          </>
        )}
      </div>

      {/* Komunita */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 text-center">Moje statistiky</h3>
        <div className="space-y-4">
          {statRows ? statRows.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-accent leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          )) : (
            [...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-7 w-16 bg-gray-800 rounded animate-pulse mx-auto" />
                <div className="h-3 w-28 bg-gray-800 rounded animate-pulse mx-auto mt-2" />
              </div>
            ))
          )}
        </div>

        {/* Top lidé */}
        {stats && (stats.topDirector || stats.topWriter || stats.topActor || stats.topActress || stats.topActorVoice || stats.topActressVoice) && (
          <div className="mt-5 pt-4 border-t border-gray-800">
            <h4 className="text-sm font-semibold text-white mb-3 text-center">Nejsledovanější</h4>
            <div className="space-y-4">
              {[
                [{ label: 'Režisér', person: stats.topDirector }, { label: 'Scenárista', person: stats.topWriter }],
                [{ label: 'Herečka', person: stats.topActress }, { label: 'Herec', person: stats.topActor }],
                [{ label: 'Herečka (hlas)', person: stats.topActressVoice }, { label: 'Herec (hlas)', person: stats.topActorVoice }],
              ].map((row, rowIdx) => {
                const visible = row.filter(r => r.person)
                if (visible.length === 0) return null
                return (
                  <div key={rowIdx} className="grid grid-cols-2 gap-2">
                    {row.map(({ label, person }) => (
                      <div key={label} className="text-center">
                        {person ? (
                          <>
                            <p className="text-xs text-gray-500 mb-2">{label}</p>
                            <Link href={`/herci/${person.slug}`} className="inline-flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity">
                              <div className="relative w-24 h-[144px] rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                                {person.photo_url
                                  ? <Image src={person.photo_url} alt={person.name} fill className="object-cover object-top" />
                                  : <PersonPlaceholder />
                                }
                              </div>
                              <div>
                                <p className="text-xs font-medium text-white leading-tight">{person.name}</p>
                                <p className="text-xs text-gray-500">{person.cnt.toLocaleString('cs-CZ')} epizod</p>
                              </div>
                            </Link>
                          </>
                        ) : (
                          <div className="w-24 h-[144px] mx-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Watchlist */}
      {isLoggedIn && watchlist && watchlist.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Můj watchlist</h3>
            <Link href="/profil" className="text-xs text-gray-500 hover:text-accent transition-colors">Vše →</Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {watchlist.map(show => (
              <Link key={show.id} href={`/serialy/${show.slug}`} title={show.title}>
                <div className="relative aspect-[2/3] rounded overflow-hidden bg-gray-800 hover:opacity-80 transition-opacity">
                  {show.poster_url
                    ? <Image src={show.poster_url} alt={show.title} fill className="object-cover" />
                    : <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">TV</div>
                  }
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
