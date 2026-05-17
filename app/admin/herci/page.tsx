import Link from 'next/link'
import Image from 'next/image'
import { dbAll } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin – Herci' }
export const dynamic = 'force-dynamic'

export default async function AdminHerciPage() {
  const people = await dbAll(`
    SELECT p.*, COUNT(DISTINCT sp.show_id) as show_count
    FROM people p LEFT JOIN show_people sp ON p.id = sp.person_id
    GROUP BY p.id ORDER BY p.name
  `)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Herci & tvůrci ({people.length})</h1>
        <Link href="/admin/herci/pridat" className="btn-primary">+ Přidat</Link>
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Jméno</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Seriálů</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {people.map((p: any) => (
              <tr key={p.id as number} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.photo_url && (
                      <Image src={p.photo_url as string} alt="" width={36} height={36} className="rounded-full object-cover flex-shrink-0" />
                    )}
                    <span className="text-gray-100">{p.name as string}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{p.show_count as number}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/herci/${p.id}`} className="text-amber-400 hover:text-amber-300 text-xs">Upravit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
