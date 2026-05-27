import { dbAll, dbGet } from '@/lib/db'
import ShowCard from '@/components/ShowCard'
import Pagination from '@/components/Pagination'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Seriály' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 24

export default async function SeriályPage({ searchParams }: { searchParams: Record<string, string> }) {
  const page = Math.max(1, Number(searchParams.page ?? 1))

  const franchises = await dbAll('SELECT * FROM franchises ORDER BY name')
  const genres = await dbAll('SELECT id, COALESCE(name_cs, name) as name FROM genres ORDER BY name')
  const networks = await dbAll("SELECT DISTINCT network FROM shows WHERE network IS NOT NULL ORDER BY network")

  let sql = 'SELECT DISTINCT s.* FROM shows s'
  const args: (string | number)[] = []

  if (searchParams.genre) {
    sql += ' JOIN show_genres sg ON s.id = sg.show_id'
  }

  sql += ' WHERE s.active = 1'

  if (searchParams.q) { sql += ' AND s.title LIKE ?'; args.push(`%${searchParams.q}%`) }
  if (searchParams.genre) { sql += ' AND sg.genre_id = ?'; args.push(searchParams.genre) }
  if (searchParams.franchise === 'standalone') {
    sql += ' AND s.franchise_id IS NULL'
  } else if (searchParams.franchise) {
    sql += ' AND s.franchise_id = ?'
    args.push(searchParams.franchise)
  }
  if (searchParams.country) { sql += ' AND s.country = ?'; args.push(searchParams.country) }
  if (searchParams.network) { sql += ' AND s.network LIKE ?'; args.push(`%${searchParams.network}%`) }
  if (searchParams.status) { sql += ' AND s.status = ?'; args.push(searchParams.status) }

  const countSql = sql.replace('SELECT DISTINCT s.*', 'SELECT COUNT(DISTINCT s.id) as count')
  const countResult = await dbGet(countSql, args)
  const total = Number((countResult as any)?.count ?? 0)

  const sort = searchParams.sort ?? 'date'
  if (sort === 'alpha') sql += ' ORDER BY s.title ASC'
  else if (sort === 'rating') sql += ' ORDER BY s.rating_imdb DESC'
  else if (sort === 'popular') sql += ' ORDER BY s.popularity DESC'
  else sql += ' ORDER BY s.created_at DESC'

  sql += ` LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`

  const shows = await dbAll(sql, args)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">
        {searchParams.q ? <>Výsledky pro &bdquo;{searchParams.q}&ldquo;</> : 'Seriály'}
      </h1>

      <form method="get" className="flex flex-wrap gap-3 mb-8">
        <select name="genre" defaultValue={searchParams.genre ?? ''} className="input w-auto text-sm">
          <option value="">Všechny žánry</option>
          {genres.map((g: any) => <option key={g.id as number} value={g.id as number}>{g.name as string}</option>)}
        </select>
        <select name="franchise" defaultValue={searchParams.franchise ?? ''} className="input w-auto text-sm">
          <option value="">Všechny franchise</option>
          <option value="standalone">Bez franchise</option>
          {franchises.map((f: any) => <option key={f.id as number} value={f.id as number}>{f.name as string}</option>)}
        </select>
        <select name="country" defaultValue={searchParams.country ?? ''} className="input w-auto text-sm">
          <option value="">Všechny země</option>
          <option value="US">USA</option>
          <option value="UK">Velká Británie</option>
        </select>
        <select name="network" defaultValue={searchParams.network ?? ''} className="input w-auto text-sm">
          <option value="">Všechny sítě</option>
          {networks.map((n: any) => <option key={n.network as string} value={n.network as string}>{n.network as string}</option>)}
        </select>
        <select name="status" defaultValue={searchParams.status ?? ''} className="input w-auto text-sm">
          <option value="">Vše</option>
          <option value="Returning Series">Pokračuje</option>
          <option value="Ended">Ukončeno</option>
        </select>
        <select name="sort" defaultValue={searchParams.sort ?? 'date'} className="input w-auto text-sm">
          <option value="date">Datum přidání</option>
          <option value="alpha">Abecedně</option>
          <option value="rating">Hodnocení</option>
          <option value="popular">Popularita</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Filtrovat</button>
      </form>

      {shows.length === 0 ? (
        <p className="text-gray-500 text-center py-20">Žádné seriály nenalezeny.</p>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-4">{shows.length} seriálů</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {shows.map((s: any) => <ShowCard key={s.id as number} show={s as any} />)}
          </div>
          <Pagination page={page} total={total} perPage={PER_PAGE} searchParams={searchParams} />
        </>
      )}
    </div>
  )
}
