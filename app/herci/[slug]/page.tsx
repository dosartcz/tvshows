import { notFound } from 'next/navigation'
import Image from 'next/image'
import { dbGet, dbAll } from '@/lib/db'
import ShowCard from '@/components/ShowCard'
import PersonPlaceholder from '@/components/PersonPlaceholder'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await dbGet<{ name: string }>('SELECT name FROM people WHERE slug = ?', [params.slug])
  return { title: p?.name ?? 'Herec' }
}

export default async function PersonDetailPage({ params }: Props) {
  const person = await dbGet('SELECT * FROM people WHERE slug = ?', [params.slug])
  if (!person) notFound()

  const shows = await dbAll(`
    SELECT s.*, GROUP_CONCAT(sp.role, ', ') as role, MAX(sp.character_name) as character_name
    FROM show_people sp JOIN shows s ON sp.show_id = s.id
    WHERE sp.person_id = ?
    GROUP BY s.id
    ORDER BY s.first_air_date DESC
  `, [person.id as number])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex gap-8">
        {/* Hlavní obsah */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-8 mb-12">
            <div className="flex-shrink-0">
              <div className="relative w-56 h-[336px] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shadow-2xl">
                {person.photo_url ? (
                  <Image src={person.photo_url as string} alt={person.name as string} fill className="object-cover object-top" />
                ) : (
                  <PersonPlaceholder />
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{person.name as string}</h1>
              {person.birth_date && (
                <p className="text-gray-500 text-sm mb-1">Narozen/a: {new Date(person.birth_date as string).toLocaleDateString('cs-CZ')}</p>
              )}
              {person.nationality && <p className="text-gray-500 text-sm mb-4">{person.nationality as string}</p>}
              {(person.bio_cs || person.bio) && (
                <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">{(person.bio_cs || person.bio) as string}</p>
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-6">Filmografie ({shows.length})</h2>
          {shows.length === 0 ? (
            <p className="text-gray-500">Žádné seriály.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {shows.map((s: any) => <ShowCard key={`${s.id}-${s.role}`} show={s as any} />)}
            </div>
          )}
        </div>

        {/* Sidebar — banner */}
        <div className="hidden lg:block w-64 flex-shrink-0 pt-2">
          <div className="sticky top-6">
            <div className="w-full h-[600px] bg-gray-900 border border-gray-800 border-dashed rounded-lg flex items-center justify-center">
              <span className="text-xs text-gray-700 text-center px-4">Banner 160×600</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
