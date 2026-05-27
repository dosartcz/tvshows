'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PersonRowActions from './PersonRowActions'

interface Person {
  id: number
  name: string
  photo_url: string | null
  birth_date: string | null
  nationality: string | null
  show_count: number
  active: number
}

export default function AdminPeopleTable({ people }: { people: Person[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const allChecked = people.length > 0 && selected.size === people.length

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(people.map(p => p.id)))
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkDelete() {
    if (!confirm(`Smazat ${selected.size} osob?`)) return
    setDeleting(true)
    await fetch('/api/admin/people/bulk-delete', {
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
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Jméno</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Národnost</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Seriálů</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {people.map(p => (
              <tr
                key={p.id}
                className={`hover:bg-gray-800/50 transition-colors cursor-pointer group ${p.active === 0 ? 'opacity-50' : ''} ${selected.has(p.id) ? 'bg-gray-800/30' : ''}`}
              >
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="rounded border-gray-600 bg-gray-800 text-accent cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/herci/${p.id}`} className="flex items-center gap-3">
                    {p.photo_url ? (
                      <Image src={p.photo_url} alt="" width={32} height={48} className="rounded object-cover object-top flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-12 rounded bg-gray-800 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-gray-100 group-hover:text-accent transition-colors">{p.name}</p>
                      {p.birth_date && (
                        <p className="text-gray-600 text-xs">{new Date(p.birth_date).getFullYear()}</p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                  <Link href={`/admin/herci/${p.id}`} className="block">{p.nationality ?? '–'}</Link>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                  <Link href={`/admin/herci/${p.id}`} className="block">{p.show_count}</Link>
                </td>
                <td className="px-4 py-3">
                  <PersonRowActions id={p.id} active={p.active !== 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
