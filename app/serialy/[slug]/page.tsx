import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbGet, dbAll } from '@/lib/db'
import ShowArticles from '@/components/ShowArticles'
import ShowCard from '@/components/ShowCard'
import CastGrid from '@/components/CastGrid'
import WatchlistButton from '@/components/WatchlistButton'
import ShowEpisodesTracker from '@/components/ShowEpisodesTracker'
import UserRatingBadge from '@/components/UserRatingBadge'
import MarkAllWatchedButton from '@/components/MarkAllWatchedButton'
import { getSimilarShows } from '@/lib/tmdb'
import CommunitySidebar from '@/components/CommunitySidebar'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const show = await dbGet<{ title: string }>('SELECT title FROM shows WHERE slug = ?', [params.slug])
  return { title: show?.title ?? 'Seriál' }
}

export default async function ShowDetailPage({ params, searchParams }: Props & { searchParams: Record<string, string> }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as number | null

  const show = await dbGet(`
    SELECT s.*, f.name as franchise_name, f.slug as franchise_slug
    FROM shows s LEFT JOIN franchises f ON s.franchise_id = f.id
    WHERE s.slug = ? AND s.active = 1
  `, [params.slug])

  if (!show) notFound()

  const genres = await dbAll(`
    SELECT g.id, COALESCE(g.name_cs, g.name) as name
    FROM show_genres sg JOIN genres g ON sg.genre_id = g.id
    WHERE sg.show_id = ? ORDER BY g.name
  `, [show.id as number])

  const watchProviders = await dbAll(`
    SELECT wp.id, wp.name, wp.logo_url, swp.type
    FROM show_watch_providers swp JOIN watch_providers wp ON swp.provider_id = wp.id
    WHERE swp.show_id = ? ORDER BY swp.type, wp.name
  `, [show.id as number])

  const franchiseShowsRaw = show.franchise_id
    ? await dbAll(`SELECT * FROM shows WHERE franchise_id = ? AND id != ? AND active = 1 ORDER BY first_air_date`, [show.franchise_id as number, show.id as number])
    : []

  const similarTmdb = show.tmdb_id ? await getSimilarShows(show.tmdb_id as number).catch(() => []) : []
  const similarTmdbIds = similarTmdb.map((s: any) => s.id)
  const similarInDb = similarTmdbIds.length > 0
    ? await dbAll(`SELECT * FROM shows WHERE active = 1 AND tmdb_id IN (${similarTmdbIds.map(() => '?').join(',')}) LIMIT 8`, similarTmdbIds)
    : []
  const similarInDbIds = new Set(similarInDb.map((s: any) => s.id as number))
  const franchiseShows = franchiseShowsRaw.filter((s: any) => !similarInDbIds.has(s.id as number))

  const seasons = await dbAll('SELECT * FROM seasons WHERE show_id = ? ORDER BY season_number', [show.id as number])

  const episodesBySeasonId = new Map<number, any[]>()
  for (const season of seasons) {
    const eps = await dbAll('SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number', [season.id as number])
    episodesBySeasonId.set(season.id as number, eps)
  }

  // Guest stars per episode
  const episodeGuestStars = new Map<number, any[]>()
  for (const season of seasons) {
    const eps = episodesBySeasonId.get(season.id as number) ?? []
    for (const ep of eps) {
      const guests = await dbAll(`
        SELECT p.id, p.name, p.slug, p.photo_url, ep2.character_name
        FROM episode_people ep2 JOIN people p ON ep2.person_id = p.id
        WHERE ep2.episode_id = ? AND ep2.role = 'guest'
        LIMIT 5
      `, [ep.id as number])
      if (guests.length > 0) episodeGuestStars.set(ep.id as number, guests)
    }
  }

  const cast = await dbAll(`
    SELECT p.id, p.name, p.slug, p.photo_url, sp.role, sp.character_name,
      COALESCE(
        NULLIF(
          (SELECT COUNT(DISTINCT ep.episode_id)
           FROM episode_people ep JOIN episodes e ON ep.episode_id = e.id
           WHERE ep.person_id = p.id AND e.show_id = ? AND ep.role = 'cast'),
          0
        ),
        sp.episode_count
      ) as episode_count
    FROM show_people sp JOIN people p ON sp.person_id = p.id
    WHERE sp.show_id = ? AND sp.role = 'actor'
    ORDER BY sp.episode_count DESC NULLS LAST, sp.cast_order ASC NULLS LAST, p.name
  `, [show.id as number, show.id as number])

  const crew = await dbAll(`
    SELECT p.id, p.name, p.slug, p.photo_url,
      GROUP_CONCAT(DISTINCT sp.role) as role,
      (SELECT COUNT(DISTINCT ep.episode_id)
       FROM episode_people ep JOIN episodes e ON ep.episode_id = e.id
       WHERE ep.person_id = p.id AND e.show_id = ?
         AND ep.role IN ('director', 'writer', 'creator')) as episode_count
    FROM show_people sp JOIN people p ON sp.person_id = p.id
    WHERE sp.show_id = ? AND sp.role != 'actor'
    GROUP BY p.id
    ORDER BY episode_count DESC NULLS LAST, p.name
  `, [show.id as number, show.id as number])

  const creators = await dbAll(`
    SELECT p.id, p.name, p.slug
    FROM show_people sp JOIN people p ON sp.person_id = p.id
    WHERE sp.show_id = ? AND sp.role = 'creator'
    ORDER BY p.name
  `, [show.id as number])

  const articles = await dbAll(`
    SELECT a.* FROM articles a
    JOIN article_shows ars ON a.id = ars.article_id
    WHERE ars.show_id = ?
    ORDER BY a.published_at DESC LIMIT 20
  `, [show.id as number])

  // User-specific data
  let userInWatchlist = false
  let userRating: number | null = null
  const watchedEpisodeIds = new Set<number>()

  if (userId) {
    const wl = await dbGet(
      'SELECT 1 FROM user_watchlist WHERE user_id = ? AND show_id = ?',
      [userId, show.id as number]
    )
    userInWatchlist = !!wl

    const rat = await dbGet<{ rating: number }>(
      'SELECT rating FROM user_show_ratings WHERE user_id = ? AND show_id = ?',
      [userId, show.id as number]
    )
    userRating = rat?.rating ?? null

    const watched = await dbAll<{ episode_id: number }>(
      `SELECT ue.episode_id FROM user_episodes ue
       JOIN episodes e ON ue.episode_id = e.id
       WHERE ue.user_id = ? AND e.show_id = ?`,
      [userId, show.id as number]
    )
    watched.forEach(w => watchedEpisodeIds.add(w.episode_id))
  }

  const totalEpisodeCount = await dbGet<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM episodes e
     JOIN seasons sea ON e.season_id = sea.id
     WHERE e.show_id = ? AND sea.season_number > 0`,
    [show.id as number]
  )

  // Pro canRate a allWatched počítáme jen odvysílané epizody mimo sezónu 0
  const now = new Date()
  const regularEpisodeIds = seasons
    .filter((s: any) => s.season_number > 0)
    .flatMap((s: any) => (episodesBySeasonId.get(s.id as number) ?? [])
      .filter((e: any) => e.air_date && new Date(e.air_date) <= now)
      .map((e: any) => e.id as number))
  const watchedRegularCount = regularEpisodeIds.filter((id: number) => watchedEpisodeIds.has(id)).length

  const canRate = userId !== null
    && regularEpisodeIds.length > 0
    && watchedRegularCount >= regularEpisodeIds.length

  const tab = searchParams.tab ?? 'epizody'
  const year = show.first_air_date ? new Date(show.first_air_date as string).getFullYear() : null
  const endYear = show.last_air_date ? new Date(show.last_air_date as string).getFullYear() : null

  const TYPE_CS: Record<string, string> = {
    Scripted: 'Hrané', Reality: 'Reality', Documentary: 'Dokument',
    News: 'Zprávy', 'Talk Show': 'Talk show', Miniseries: 'Minisérie',
  }
  const typeLabel = show.type ? (TYPE_CS[show.type as string] ?? show.type as string) : null

  return (
    <div className="min-h-screen">
      <div className="relative h-[50vh] min-h-[300px] overflow-hidden">
        {show.backdrop_url ? (
          <>
            <Image src={show.backdrop_url as string} alt={show.title as string} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gray-900" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-64 relative">
        <div className="flex gap-8">
        <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="flex-shrink-0 flex flex-col w-56 gap-3">
            <div className="relative w-56 h-[336px] rounded-lg overflow-hidden bg-gray-800 shadow-2xl border border-gray-700">
              {show.poster_url ? (
                <Image src={show.poster_url as string} alt={show.title as string} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-4xl">TV</div>
              )}
            </div>
            <div className="rounded-lg border border-gray-700 flex divide-x divide-gray-700">
              <WatchlistButton showId={show.id as number} initialInList={userInWatchlist} initialAllWatched={regularEpisodeIds.length > 0 && watchedRegularCount >= regularEpisodeIds.length} variant="wide" />
              <MarkAllWatchedButton allEpisodeIds={regularEpisodeIds} initialWatchedIds={Array.from(watchedEpisodeIds)} variant="wide" showId={show.id as number} initialInWatchlist={userInWatchlist} />
            </div>
          </div>

          <div className="flex-1 pt-2">
            <div className="flex flex-wrap gap-2 mb-3">
              {show.network && <span className="badge bg-gray-800 text-gray-300">{show.network as string}</span>}
              {typeLabel && <span className="badge bg-gray-800 text-gray-300">{typeLabel}</span>}
              {show.franchise_slug && (
                <Link href={`/franchise/${show.franchise_slug}`} className="badge bg-accent-dark/50 text-accent hover:bg-accent-dark">
                  {show.franchise_name as string}
                </Link>
              )}
              {show.status && (
                <span className={`badge ${show.status === 'Ended' ? 'bg-accent-dark/50 text-accent-hover' : 'bg-green-900/50 text-green-400'}`}>
                  {show.status === 'Ended' ? 'Ukončeno' : 'Pokračuje'}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{show.title as string}</h1>
            {creators.length > 0 && (
              <p className="text-sm text-gray-400 mb-2">
                <span className="text-gray-600">Tvůrce: </span>
                {(creators as any[]).map((c: any, i: number) => (
                  <span key={c.id}>
                    <Link href={`/herci/${c.slug}`} className="hover:text-accent transition-colors">{c.name}</Link>
                    {i < creators.length - 1 && ', '}
                  </span>
                ))}
              </p>
            )}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {genres.map((g: any) => (
                  <a key={g.id} href={`/serialy?genre=${g.id}`} className="badge bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-xs">
                    {g.name as string}
                  </a>
                ))}
              </div>
            )}
            <p className="text-gray-400 mb-4">
              {year}{endYear && endYear !== year ? `–${endYear}` : year && show.status !== 'Ended' ? '–' : ''}
              {show.number_of_episodes && <span> · {show.number_of_episodes as number} epizod</span>}
              {show.in_production ? <span className="text-green-500"> · Ve výrobě</span> : null}
            </p>

            <div className="flex flex-wrap gap-3 mb-4">
              {show.rating_imdb && (
                <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                  <span className="text-accent font-bold text-lg leading-none">IMDb</span>
                  <span className="text-white font-bold text-xl leading-none">{(show.rating_imdb as number).toFixed(1)}</span>
                  <span className="text-gray-500 text-xs">/10</span>
                  {show.rating_imdb_votes && (
                    <span className="text-gray-500 text-xs hidden sm:inline">· {show.rating_imdb_votes as string}</span>
                  )}
                </div>
              )}
              {show.rating_tmdb && (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  <span className="text-blue-400 font-bold text-lg leading-none">TMDb</span>
                  <span className="text-white font-bold text-xl leading-none">{(show.rating_tmdb as number).toFixed(1)}</span>
                  <span className="text-gray-500 text-xs">/10</span>
                </div>
              )}
              {show.rating_rt != null && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                  (show.rating_rt as number) >= 60
                    ? 'bg-accent/10 border-accent/20'
                    : 'bg-orange-500/10 border-orange-500/20'
                }`}>
                  <span className="text-lg leading-none">{(show.rating_rt as number) >= 60 ? '🍅' : '🤢'}</span>
                  <span className="text-white font-bold text-xl leading-none">{show.rating_rt as number}%</span>
                  <span className="text-gray-500 text-xs">RT</span>
                </div>
              )}
              {show.rating_metacritic != null && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                  (show.rating_metacritic as number) >= 61
                    ? 'bg-green-500/10 border-green-500/20'
                    : (show.rating_metacritic as number) >= 40
                    ? 'bg-accent/10 border-accent/20'
                    : 'bg-accent-dark/10 border-accent-dark/20'
                }`}>
                  <span className={`font-bold text-sm leading-none px-1.5 py-0.5 rounded-lg ${
                    (show.rating_metacritic as number) >= 61 ? 'bg-green-500 text-white'
                    : (show.rating_metacritic as number) >= 40 ? 'bg-accent text-gray-950'
                    : 'bg-accent text-gray-950'
                  }`}>{show.rating_metacritic as number}</span>
                  <span className="text-gray-400 text-xs">Metacritic</span>
                </div>
              )}
              {userId && <UserRatingBadge initialRating={userRating} />}
            </div>

            {watchProviders.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500 shrink-0">Dostupné v CZ:</span>
                <div className="flex flex-wrap gap-2">
                  {watchProviders.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2 py-1" title={p.name as string}>
                      {p.logo_url ? (
                        <Image src={p.logo_url as string} alt={p.name as string} width={20} height={20} className="rounded-lg" />
                      ) : null}
                      <span className="text-xs text-gray-300">{p.name as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(show.description_cs || show.description) && (
              <p className="text-gray-300 text-sm leading-relaxed max-w-2xl mb-4">
                {(show.description_cs || show.description) as string}
              </p>
            )}


          </div>
        </div>

        <div className="py-8 space-y-12">

          <ShowArticles articles={articles as any[]} />

          <ShowEpisodesTracker
            showId={show.id as number}
            showSlug={params.slug}
            seasons={seasons as any[]}
            episodesBySeasonId={Object.fromEntries(
              seasons.map((s: any) => [s.id, episodesBySeasonId.get(s.id as number) ?? []])
            )}
            guestStarsByEpisodeId={Object.fromEntries(
              Array.from(episodeGuestStars.entries())
            )}
            initialWatchedIds={Array.from(watchedEpisodeIds)}
            initialRating={userRating}
          />

          {(cast.length > 0 || crew.length > 0) && (
            <div className="space-y-10">
              {cast.length > 0 && <CastGrid people={cast} label="Herci" showId={show.id as number} showSlug={show.slug as string} />}
              {crew.length > 0 && <CastGrid people={crew} label="Tvůrci & štáb" limit={6} showId={show.id as number} showSlug={show.slug as string} />}
            </div>
          )}
        </div>

        {similarInDb.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-6">Mohlo by se ti líbit</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {similarInDb.map((s: any) => <ShowCard key={s.id as number} show={s as any} />)}
            </div>
          </div>
        )}

        {franchiseShows.length > 0 && (
          <div className="mt-12 pb-12">
            <h2 className="text-xl font-bold text-white mb-6">Ostatní ze světa {show.franchise_name as string}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {franchiseShows.map((s: any) => <ShowCard key={s.id as number} show={s as any} />)}
            </div>
          </div>
        )}
        </div>{/* end main content */}

        {/* Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0 pt-2">
          <CommunitySidebar />
        </div>

        </div>{/* end flex gap-8 */}
      </div>
    </div>
  )
}
