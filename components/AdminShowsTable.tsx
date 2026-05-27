'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ShowRowActions from './ShowRowActions'

interface Show {
  id: number
  title: string
  poster_url: string | null
  country: string | null
  first_air_date: string | null
  franchise_name: string | null
  status: string | null
  rating_imdb: number | null
  active: number
}

export default function AdminShowsTable({ shows }: { shows: Show[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const allChecked = shows.length > 0 && selected.size === shows.length

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(shows.map(s => s.id)))
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkDelete() {
    if (!confirm(`Smazat ${selected.size} seriálů?`)) return
    setDeleting(true)
    await fetch('/api/admin/shows/bulk-delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setSelected(new Set())
    setDeleting(false)
    router.refresh()
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg">
          <span className="text-sm text-gray-300">Vybráno: <strong className="text-white">{selected.size}</strong></span>
          <button
            onClick={bulkDelete}
            disabled={deleting}
            className="ml-auto btn-danger text-xs px-3 py-1.5"
          >
            {deleting ? 'Mažu...' : 'Smazat vybrané'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-300">
            Zrušit výběr
          </button>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="rounded border-gray-600 bg-gray-800 text-accent cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Seriál</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Franchise</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">IMDb</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {shows.map(s => (
              <tr
                key={s.id}
                className={`hover:bg-gray-800/50 transition-colors cursor-pointer group ${!s.active ? 'opacity-50' : ''} ${selected.has(s.id) ? 'bg-gray-800/30' : ''}`}
              >
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="rounded border-gray-600 bg-gray-800 text-accent cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/serialy/${s.id}`} className="flex items-center gap-3">
                    {s.poster_url && (
                      <Image src={s.poster_url} alt="" width={32} height={48} className="rounded object-cover flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-gray-100 group-hover:text-accent transition-colors">{s.title}</p>
                      <p className="text-gray-600 text-xs">
                        {s.country} {s.first_air_date ? new Date(s.first_air_date).getFullYear() : ''}
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                  <Link href={`/admin/serialy/${s.id}`} className="block">{s.franchise_name ?? '–'}</Link>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Link href={`/admin/serialy/${s.id}`} className="block">
                    {s.status && (
                      <span className={`badge text-xs ${s.status === 'Ended' ? 'bg-accent-dark/50 text-accent-hover' : 'bg-green-900/50 text-green-400'}`}>
                        {s.status === 'Ended' ? 'Ukončeno' : 'Pokračuje'}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-3 text-accent font-medium hidden lg:table-cell">
                  <Link href={`/admin/serialy/${s.id}`} className="block">{s.rating_imdb ? `★ ${s.rating_imdb}` : '–'}</Link>
                </td>
                <td className="px-4 py-3">
                  <ShowRowActions id={s.id} active={s.active !== 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
