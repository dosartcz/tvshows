import Link from 'next/link'
import Image from 'next/image'
import { dbAll } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin – Seriály' }
export const dynamic = 'force-dynamic'

export default async function AdminSeriályPage() {
  const shows = await dbAll(`
    SELECT s.*, f.name as franchise_name
    FROM shows s LEFT JOIN franchises f ON s.franchise_id = f.id
    ORDER BY s.created_at DESC
  `)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Seriály ({shows.length})</h1>
        <Link href="/admin/serialy/pridat" className="btn-primary">+ Přidat seriál</Link>
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Seriál</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Franchise</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">IMDb</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {shows.map((s: any) => (
              <tr key={s.id as number} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {s.poster_url && (
                      <Image src={s.poster_url as string} alt="" width={32} height={48} className="rounded object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-gray-100">{s.title as string}</p>
                      <p className="text-gray-600 text-xs">
                        {s.country} {s.first_air_date ? new Date(s.first_air_date as string).getFullYear() : ''}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{(s.franchise_name as string) ?? '–'}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {s.status && (
                    <span className={`badge text-xs ${s.status === 'Ended' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                      {s.status === 'Ended' ? 'Ukončeno' : 'Pokračuje'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-amber-400 font-medium hidden lg:table-cell">
                  {s.rating_imdb ? `★ ${s.rating_imdb}` : '–'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/serialy/${s.id}`} className="text-amber-400 hover:text-amber-300 text-xs">Upravit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
