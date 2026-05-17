import Image from 'next/image'
import Link from 'next/link'
import { dbGet, dbAll } from '@/lib/db'
import ShowCard from '@/components/ShowCard'
import ArticleCard from '@/components/ArticleCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const featured = await dbGet('SELECT * FROM shows ORDER BY created_at DESC LIMIT 1')

  const topShows = await dbAll(
    'SELECT * FROM shows WHERE rating_imdb IS NOT NULL ORDER BY rating_imdb DESC LIMIT 10'
  )

  const articles = await dbAll('SELECT * FROM articles ORDER BY published_at DESC LIMIT 6')

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
              <span className="badge bg-amber-500/20 text-amber-400 mb-3">Nově přidáno</span>
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
                  <span className="text-amber-400 font-bold">★ {(featured.rating_imdb as number).toFixed(1)} IMDb</span>
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
              <h2 className="text-2xl font-bold text-white">Nejnovější články</h2>
              <Link href="/clanky" className="text-sm text-amber-400 hover:text-amber-300">Všechny články →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a: any) => <ArticleCard key={a.id as number} article={a as any} />)}
            </div>
          </section>
        )}

        {topShows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nejsledovanější seriály</h2>
              <Link href="/serialy" className="text-sm text-amber-400 hover:text-amber-300">Všechny seriály →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {topShows.map((s: any) => <ShowCard key={s.id as number} show={s as any} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
