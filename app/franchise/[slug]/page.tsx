import { notFound } from 'next/navigation'
import { dbGet, dbAll } from '@/lib/db'
import ShowCard from '@/components/ShowCard'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = await dbGet<{ name: string }>('SELECT name FROM franchises WHERE slug = ?', [params.slug])
  return { title: f?.name ?? 'Franchise' }
}

export default async function FranchisePage({ params }: Props) {
  const franchise = await dbGet('SELECT * FROM franchises WHERE slug = ?', [params.slug])
  if (!franchise) notFound()

  const shows = await dbAll(
    'SELECT * FROM shows WHERE franchise_id = ? ORDER BY first_air_date ASC',
    [franchise.id as number]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">{franchise.name as string}</h1>
        {!!franchise.description && <p className="text-gray-400 max-w-2xl">{franchise.description as string}</p>}
      </div>
      {shows.length === 0 ? (
        <p className="text-gray-500">Žádné seriály v této franchise.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {shows.map((s: any) => <ShowCard key={s.id as number} show={s as any} />)}
        </div>
      )}
    </div>
  )
}
