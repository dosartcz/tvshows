import { dbAll } from '@/lib/db'
import ShowCard from '@/components/ShowCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Seriály' }
export const dynamic = 'force-dynamic'

export default async function SeriályPage({ searchParams }: { searchParams: Record<string, string> }) {
  const franchises = await dbAll('SELECT * FROM franchises ORDER BY name')

  let sql = 'SELECT * FROM shows WHERE 1=1'
  const args: (string | number)[] = []

  if (searchParams.franchise === 'standalone') {
    sql += ' AND franchise_id IS NULL'
  } else if (searchParams.franchise) {
    sql += ' AND franchise_id = ?'
    args.push(searchParams.franchise)
  }
  if (searchParams.country) { sql += ' AND country = ?'; args.push(searchParams.country) }
  if (searchParams.network) { sql += ' AND network LIKE ?'; args.push(`%${searchParams.network}%`) }
  if (searchParams.status) { sql += ' AND status = ?'; args.push(searchParams.status) }

  const sort = searchParams.sort ?? 'date'
  if (sort === 'alpha') sql += ' ORDER BY title ASC'
  else if (sort === 'rating') sql += ' ORDER BY rating_imdb DESC'
  else sql += ' ORDER BY created_at DESC'

  const shows = await dbAll(sql, args)
  const networks = await dbAll("SELECT DISTINCT network FROM shows WHERE network IS NOT NULL ORDER BY network")

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Seriály</h1>

      <form method="get" className="flex flex-wrap gap-3 mb-8">
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
        </>
      )}
    </div>
  )
}
