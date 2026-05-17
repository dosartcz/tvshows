import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { dbGet, dbAll } from '@/lib/db'
import StarRating from '@/components/StarRating'
import PersonCard from '@/components/PersonCard'
import ArticleCard from '@/components/ArticleCard'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const show = await dbGet<{ title: string }>('SELECT title FROM shows WHERE slug = ?', [params.slug])
  return { title: show?.title ?? 'Seriál' }
}

export default async function ShowDetailPage({ params, searchParams }: Props & { searchParams: Record<string, string> }) {
  const show = await dbGet(`
    SELECT s.*, f.name as franchise_name, f.slug as franchise_slug
    FROM shows s LEFT JOIN franchises f ON s.franchise_id = f.id
    WHERE s.slug = ?
  `, [params.slug])

  if (!show) notFound()

  const seasons = await dbAll('SELECT * FROM seasons WHERE show_id = ? ORDER BY season_number', [show.id as number])

  const episodesBySeasonId = new Map<number, any[]>()
  for (const season of seasons) {
    const eps = await dbAll('SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number', [season.id as number])
    episodesBySeasonId.set(season.id as number, eps)
  }

  const cast = await dbAll(`
    SELECT p.id, p.name, p.slug, p.photo_url, sp.role, sp.character_name
    FROM show_people sp JOIN people p ON sp.person_id = p.id
    WHERE sp.show_id = ? AND sp.role = 'actor'
    ORDER BY p.name LIMIT 24
  `, [show.id as number])

  const crew = await dbAll(`
    SELECT p.id, p.name, p.slug, p.photo_url, sp.role
    FROM show_people sp JOIN people p ON sp.person_id = p.id
    WHERE sp.show_id = ? AND sp.role != 'actor'
    ORDER BY sp.role, p.name
  `, [show.id as number])

  const articles = await dbAll(`
    SELECT a.* FROM articles a
    JOIN article_shows ars ON a.id = ars.article_id
    WHERE ars.show_id = ?
    ORDER BY a.published_at DESC LIMIT 20
  `, [show.id as number])

  const tab = searchParams.tab ?? 'epizody'
  const year = show.first_air_date ? new Date(show.first_air_date as string).getFullYear() : null
  const endYear = show.last_air_date ? new Date(show.last_air_date as string).getFullYear() : null

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative">
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="relative w-48 h-72 rounded-lg overflow-hidden bg-gray-800 shadow-2xl border border-gray-700">
              {show.poster_url ? (
                <Image src={show.poster_url as string} alt={show.title as string} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-4xl">TV</div>
              )}
            </div>
          </div>

          <div className="flex-1 pt-2">
            <div className="flex flex-wrap gap-2 mb-3">
              {show.country && <span className="badge bg-gray-800 text-gray-300">{show.country as string}</span>}
              {show.network && <span className="badge bg-gray-800 text-gray-300">{show.network as string}</span>}
              {show.status && (
                <span className={`badge ${show.status === 'Ended' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                  {show.status === 'Ended' ? 'Ukončeno' : 'Pokračuje'}
                </span>
              )}
              {show.franchise_slug && (
                <Link href={`/franchise/${show.franchise_slug}`} className="badge bg-amber-900/50 text-amber-400 hover:bg-amber-900">
                  {show.franchise_name as string}
                </Link>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{show.title as string}</h1>
            <p className="text-gray-400 mb-4">
              {year}{endYear && endYear !== year ? `–${endYear}` : year && show.status !== 'Ended' ? '–' : ''}
            </p>

            <div className="flex flex-wrap gap-6 mb-4">
              {show.rating_imdb && <StarRating rating={show.rating_imdb as number} label="IMDb" />}
              {show.rating_tmdb && <StarRating rating={show.rating_tmdb as number} label="TMDb" />}
            </div>

            {(show.description_cs || show.description) && (
              <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">
                {(show.description_cs || show.description) as string}
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 border-b border-gray-800">
          <nav className="flex gap-1">
            {['epizody', 'obsazeni', 'clanky'].map(t => (
              <Link key={t} href={`?tab=${t}`}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                {t === 'epizody' ? `Epizody (${seasons.length})` : t === 'obsazeni' ? 'Herci & tvůrci' : `Články (${articles.length})`}
              </Link>
            ))}
          </nav>
        </div>

        <div className="py-8">
          {tab === 'epizody' && (
            <div className="space-y-4">
              {seasons.map((season: any) => (
                <details key={season.id as number} className="bg-gray-900 rounded-lg border border-gray-800">
                  <summary className="px-4 py-3 cursor-pointer font-semibold text-gray-200 hover:text-white flex items-center justify-between">
                    <span>{season.name || `Sezóna ${season.season_number}`}</span>
                    <span className="text-gray-500 text-sm">{season.episode_count} epizod</span>
                  </summary>
                  <div className="divide-y divide-gray-800 border-t border-gray-800">
                    {(episodesBySeasonId.get(season.id as number) ?? []).map((ep: any) => (
                      <div key={ep.id as number} className="px-4 py-3 flex gap-4">
                        <span className="text-gray-600 text-sm w-6 flex-shrink-0">{ep.episode_number as number}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200">{ep.title as string}</p>
                          {ep.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{ep.description as string}</p>}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {ep.air_date && <p className="text-xs text-gray-600">{new Date(ep.air_date as string).toLocaleDateString('cs-CZ')}</p>}
                          {ep.runtime && <p className="text-xs text-gray-600">{ep.runtime as number} min</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
              {seasons.length === 0 && <p className="text-gray-500 text-center py-8">Žádné epizody.</p>}
            </div>
          )}

          {tab === 'obsazeni' && (
            <div className="space-y-10">
              {cast.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Herci</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {cast.map((p: any) => <PersonCard key={p.id as number} person={p as any} />)}
                  </div>
                </div>
              )}
              {crew.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Tvůrci & štáb</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {crew.map((p: any) => <PersonCard key={`${p.id}-${p.role}`} person={p as any} />)}
                  </div>
                </div>
              )}
              {cast.length === 0 && crew.length === 0 && <p className="text-gray-500 text-center py-8">Žádné informace o obsazení.</p>}
            </div>
          )}

          {tab === 'clanky' && (
            <div className="space-y-3">
              {articles.map((a: any) => <ArticleCard key={a.id as number} article={a as any} />)}
              {articles.length === 0 && <p className="text-gray-500 text-center py-8">Žádné články.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
