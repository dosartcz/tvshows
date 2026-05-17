import Link from 'next/link'
import Image from 'next/image'
import { dbAll } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Herci & tvůrci' }
export const dynamic = 'force-dynamic'

export default async function HerciPage({ searchParams }: { searchParams: Record<string, string> }) {
  const q = searchParams.q ?? ''
  const sort = searchParams.sort ?? 'name'

  let sql = `SELECT p.*, COUNT(DISTINCT sp.show_id) as show_count
             FROM people p LEFT JOIN show_people sp ON p.id = sp.person_id`
  const args: string[] = []

  if (q) { sql += ' WHERE p.name LIKE ?'; args.push(`%${q}%`) }
  sql += ' GROUP BY p.id'
  sql += sort === 'shows' ? ' ORDER BY show_count DESC, p.name' : ' ORDER BY p.name'

  const people = await dbAll(sql, args)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Herci & tvůrci</h1>
      <form method="get" className="flex gap-3 mb-8">
        <input name="q" defaultValue={q} placeholder="Hledat..." className="input max-w-xs text-sm" />
        <select name="sort" defaultValue={sort} className="input w-auto text-sm">
          <option value="name">Abecedně</option>
          <option value="shows">Počet seriálů</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Hledat</button>
      </form>
      <p className="text-gray-500 text-sm mb-4">{people.length} osob</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
        {people.map((p: any) => (
          <Link key={p.id as number} href={`/herci/${p.slug}`} className="group flex flex-col items-center text-center gap-2">
            <div className="relative w-full aspect-square rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-amber-500 transition-colors">
              {p.photo_url ? (
                <Image src={p.photo_url as string} alt={p.name as string} fill className="object-cover object-top" sizes="120px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600">👤</div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300 group-hover:text-amber-400 transition-colors line-clamp-2">{p.name as string}</p>
              <p className="text-xs text-gray-600">{p.show_count as number} seriálů</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
