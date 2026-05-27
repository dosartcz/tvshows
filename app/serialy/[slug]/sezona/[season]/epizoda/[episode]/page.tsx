import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbGet, dbAll } from '@/lib/db'
import PersonPlaceholder from '@/components/PersonPlaceholder'
import EpisodeWatchButton from '@/components/EpisodeWatchButton'
import EpisodeStillsGallery from '@/components/EpisodeStillsGallery'
import CommunitySidebar from '@/components/CommunitySidebar'
import { getEpisodeStills } from '@/lib/tmdb'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string; season: string; episode: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ep = await dbGet<{ title: string; show_title: string }>(`
    SELECT e.title, s.title as show_title
    FROM episodes e
    JOIN seasons sea ON e.season_id = sea.id
    JOIN shows s ON e.show_id = s.id
    WHERE s.slug = ? AND sea.season_number = ? AND e.episode_number = ?
  `, [params.slug, params.season, params.episode])
  return { title: ep ? `${ep.title} | ${ep.show_title}` : 'Epizoda' }
}

export default async function EpisodePage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as number | null

  const episode = await dbGet(`
    SELECT e.*, s.title as show_title, s.slug as show_slug, s.backdrop_url as show_backdrop,
           s.tmdb_id as show_tmdb_id, sea.season_number, sea.name as season_name
    FROM episodes e
    JOIN seasons sea ON e.season_id = sea.id
    JOIN shows s ON e.show_id = s.id
    WHERE s.slug = ? AND sea.season_number = ? AND e.episode_number = ?
  `, [params.slug, params.season, params.episode])

  if (!episode) notFound()

  const episodeCast = await dbAll(`
    SELECT p.name, p.slug, p.photo_url, ep.character_name, ep.role
    FROM episode_people ep
    JOIN people p ON ep.person_id = p.id
    WHERE ep.episode_id = ?
    ORDER BY ep.role DESC
  `, [episode.id as number])

  const mainCast = episodeCast.filter((p: any) => p.role === 'cast')
  const guestStars = episodeCast.filter((p: any) => p.role === 'guest_star')
  const directors = episodeCast.filter((p: any) => p.role === 'director')
  const writers = episodeCast.filter((p: any) => p.role === 'writer')

  const stills = episode.show_tmdb_id
    ? await getEpisodeStills(episode.show_tmdb_id as number, episode.season_number as number, episode.episode_number as number).catch(() => [] as string[])
    : []

  let isWatched = false
  if (userId) {
    const w = await dbGet('SELECT 1 FROM user_episodes WHERE user_id = ? AND episode_id = ?', [userId, episode.id as number])
    isWatched = !!w
  }

  const seasonNum = episode.season_number as number
  const epNum = episode.episode_number as number
  const padded = `S${String(seasonNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')}`

  // Předchozí a další epizoda
  const [prevEp, nextEp] = await Promise.all([
    dbGet<{ season_number: number; episode_number: number; title: string | null }>(`
      SELECT sea.season_number, e.episode_number, e.title
      FROM episodes e JOIN seasons sea ON e.season_id = sea.id
      WHERE e.show_id = ? AND (
        sea.season_number < ? OR (sea.season_number = ? AND e.episode_number < ?)
      )
      ORDER BY sea.season_number DESC, e.episode_number DESC LIMIT 1
    `, [episode.show_id as number, seasonNum, seasonNum, epNum]),
    dbGet<{ season_number: number; episode_number: number; title: string | null }>(`
      SELECT sea.season_number, e.episode_number, e.title
      FROM episodes e JOIN seasons sea ON e.season_id = sea.id
      WHERE e.show_id = ? AND (
        sea.season_number > ? OR (sea.season_number = ? AND e.episode_number > ?)
      )
      ORDER BY sea.season_number ASC, e.episode_number ASC LIMIT 1
    `, [episode.show_id as number, seasonNum, seasonNum, epNum]),
  ])

  return (
    <div className="min-h-screen">
      {/* Hero — backdrop seriálu */}
      <div className="relative h-[50vh] min-h-[300px] overflow-hidden">
        {episode.show_backdrop ? (
          <>
            <Image src={episode.show_backdrop as string} alt={episode.show_title as string} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gray-900" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-48 relative">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
              <Link href="/serialy" className="hover:text-accent transition-colors">Seriály</Link>
              <span>›</span>
              <Link href={`/serialy/${episode.show_slug as string}`} className="hover:text-accent transition-colors">{episode.show_title as string}</Link>
              <span>›</span>
              <span className="text-gray-300">{padded}</span>
            </nav>

            {/* Info + fotka epizody */}
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              {episode.still_url && (
                <div className="flex-shrink-0 flex flex-col w-56 gap-3">
                  <div className="relative w-56 h-[126px] rounded-lg overflow-hidden bg-gray-800 shadow-xl border border-gray-700">
                    <Image src={episode.still_url as string} alt={episode.title as string ?? ''} fill className="object-cover" />
                  </div>
                  <div className="rounded-lg border border-gray-700">
                    <EpisodeWatchButton episodeId={episode.id as number} initialWatched={isWatched} airDate={episode.air_date as string | null} variant="wide" />
                  </div>
                </div>
              )}
              <div className="flex-1">
                <p className="text-accent text-sm font-medium mb-1">{padded}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{episode.title as string}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                  {episode.air_date && (
                    <span>{new Date(episode.air_date as string).toLocaleDateString('cs-CZ')}</span>
                  )}
                  {episode.runtime && <span>{episode.runtime as number} min</span>}
                  {episode.vote_average != null && (
                    <span className="text-yellow-500">
                      ★ {(episode.vote_average as number).toFixed(1)}
                      {episode.vote_count != null && (
                        <span className="text-gray-600 ml-1">({episode.vote_count as number})</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {directors.length > 0 && (
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-600">Režie: </span>
                      {directors.map((d: any, i: number) => (
                        <span key={d.slug as string}>
                          <Link href={`/herci/${d.slug}`} className="hover:text-accent transition-colors">{d.name as string}</Link>
                          {i < directors.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  )}
                  {writers.length > 0 && (
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-600">Scénář: </span>
                      {writers.map((w: any, i: number) => (
                        <span key={w.slug as string}>
                          <Link href={`/herci/${w.slug}`} className="hover:text-accent transition-colors">{w.name as string}</Link>
                          {i < writers.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                {(episode.description_cs || episode.description) && (
                  <p className="text-gray-300 text-sm leading-relaxed mt-3">
                    {(episode.description_cs || episode.description) as string}
                  </p>
                )}

              </div>
            </div>

            {(mainCast.length > 0 || guestStars.length > 0) && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Obsazení</h2>
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {[...mainCast, ...guestStars].map((g: any) => (
                      <Link key={`${g.slug}-${g.role}`} href={`/herci/${g.slug as string}`}
                        className="group flex-shrink-0 w-36 hover:opacity-80 transition-opacity">
                        <div className="relative w-36 h-[216px] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 mb-2">
                          {g.photo_url ? (
                            <Image src={g.photo_url as string} alt={g.name as string} fill className="object-cover object-top" />
                          ) : (
                            <PersonPlaceholder />
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-200 group-hover:text-accent transition-colors leading-tight">{g.name as string}</p>
                        {g.character_name && <p className="text-xs text-gray-500 leading-tight mt-0.5">{g.character_name as string}</p>}
                      </Link>
                    ))}
                  </div>
                  <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none" />
                </div>
              </div>
            )}

          {stills.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Záběry z epizody</h2>
              <EpisodeStillsGallery stills={stills} />
            </div>
          )}

          {/* Navigace epizod */}
          <div className="flex items-stretch gap-3 mb-8">
            {prevEp ? (
              <Link
                href={`/serialy/${episode.show_slug as string}/sezona/${prevEp.season_number}/epizoda/${prevEp.episode_number}`}
                className="flex-1 flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors group"
              >
                <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Předchozí</p>
                  <p className="text-sm text-gray-200 group-hover:text-white transition-colors truncate">
                    S{String(prevEp.season_number).padStart(2,'0')}E{String(prevEp.episode_number).padStart(2,'0')}
                    {prevEp.title && <span className="text-gray-400"> · {prevEp.title}</span>}
                  </p>
                </div>
              </Link>
            ) : <div className="flex-1" />}

            {nextEp ? (
              <Link
                href={`/serialy/${episode.show_slug as string}/sezona/${nextEp.season_number}/epizoda/${nextEp.episode_number}`}
                className="flex-1 flex items-center justify-end gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors group text-right"
              >
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Další</p>
                  <p className="text-sm text-gray-200 group-hover:text-white transition-colors truncate">
                    S{String(nextEp.season_number).padStart(2,'0')}E{String(nextEp.episode_number).padStart(2,'0')}
                    {nextEp.title && <span className="text-gray-400"> · {nextEp.title}</span>}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : <div className="flex-1" />}
          </div>

          </div>

          <div className="hidden lg:block w-64 flex-shrink-0">
            <CommunitySidebar />
          </div>
        </div>
      </div>
    </div>
  )
}
