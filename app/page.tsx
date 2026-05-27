import Image from 'next/image'
import Link from 'next/link'
import { dbGet, dbAll } from '@/lib/db'
import ShowCard from '@/components/ShowCard'
import ArticleCard from '@/components/ArticleCard'
import PersonPlaceholder from '@/components/PersonPlaceholder'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const featured = await dbGet('SELECT * FROM shows WHERE active = 1 ORDER BY created_at DESC LIMIT 1')

  const topShows = await dbAll(
    'SELECT * FROM shows WHERE active = 1 AND rating_imdb IS NOT NULL ORDER BY rating_imdb DESC LIMIT 12'
  )

  const popularShows = await dbAll(
    'SELECT * FROM shows WHERE active = 1 AND popularity IS NOT NULL ORDER BY popularity DESC LIMIT 6'
  )

  const articles = await dbAll(`
    SELECT a.*,
      GROUP_CONCAT(s.title, '||') as show_titles,
      GROUP_CONCAT(s.slug, '||') as show_slugs
    FROM articles a
    LEFT JOIN article_shows ars ON a.id = ars.article_id
    LEFT JOIN shows s ON ars.show_id = s.id
    GROUP BY a.id
    ORDER BY a.published_at DESC LIMIT 4
  `)

  // MM-DD v pražském timezone
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(new Date()).slice(5)
  const birthdays = await dbAll(`
    SELECT p.*, MAX(s.popularity) as max_popularity
    FROM people p
    LEFT JOIN show_people sp ON p.id = sp.person_id
    LEFT JOIN shows s ON sp.show_id = s.id
    WHERE p.birth_date IS NOT NULL AND strftime('%m-%d', p.birth_date) = ?
    GROUP BY p.id
    ORDER BY max_popularity DESC NULLS LAST, p.name
  `, [today])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      {featured && (
        <section className="relative h-[70vh] min-h-[400px] overflow-hidden">
          {(featured.backdrop_url as string) && (
            <>
              <Image
                src={featured.backdrop_url as string}
                alt={featured.title as string}
                fill className="object-cover" priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
            </>
          )}
          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16">
            <div className="max-w-xl">
              <span className="badge bg-accent/10 text-accent mb-3">Nově přidáno</span>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
                {featured.title as string}
              </h1>
              {featured.description && (
                <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-6">
                  {(featured.description_cs || featured.description) as string}
                </p>
              )}
              <div className="flex items-center gap-4">
                <Link href={`/serialy/${featured.slug}`} className="btn-primary">Zobrazit detail</Link>
                {featured.rating_imdb && (
                  <span className="text-accent font-bold">★ {(featured.rating_imdb as number).toFixed(1)} IMDb</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
        {articles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nejnovější aktuality</h2>
              <Link href="/clanky" className="text-sm text-accent hover:text-accent-hover">Všechny aktuality →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {articles.map((a: any) => (
                <ArticleCard key={a.id as number} article={a as any} variant="vertical" />
              ))}
            </div>
          </section>
        )}

        {popularShows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Aktuálně populární</h2>
              <Link href="/serialy?sort=popular" className="text-sm text-accent hover:text-accent-hover">Zobrazit více →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {popularShows.map((s: any) => <ShowCard key={s.id as number} show={s as any} />)}
            </div>
          </section>
        )}

        {topShows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nejlépe hodnocené seriály</h2>
              <Link href="/serialy" className="text-sm text-accent hover:text-accent-hover">Všechny seriály →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {topShows.map((s: any) => <ShowCard key={s.id as number} show={s as any} />)}
            </div>
          </section>
        )}
        {birthdays.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Narozeni tento den</h2>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {(birthdays as any[]).slice(0, 8).map((p: any) => (
                <Link key={p.id as number} href={`/herci/${p.slug}`} className="group flex flex-col items-center text-center gap-2">
                  <div className="relative w-full rounded-lg overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-accent transition-colors" style={{aspectRatio: '2/3'}}>
                    {p.photo_url ? (
                      <Image src={p.photo_url as string} alt={p.name as string} fill className="object-cover object-top" sizes="120px" />
                    ) : (
                      <PersonPlaceholder />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-300 group-hover:text-accent transition-colors line-clamp-2">{p.name as string}</p>
                    {p.death_date ? (
                      <p className="text-xs text-gray-600">† {new Date(p.death_date as string).getFullYear() - new Date(p.birth_date as string).getFullYear()} let</p>
                    ) : (
                      <p className="text-xs text-gray-600">{new Date().getFullYear() - new Date(p.birth_date as string).getFullYear()} let</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
