import Link from 'next/link'
import { dbAll, dbGet } from '@/lib/db'
import SyncAllPeopleButton from '@/components/SyncAllPeopleButton'
import AdminPeopleTable from '@/components/AdminPeopleTable'
import Pagination from '@/components/Pagination'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin – Herci' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 50

export default async function AdminHerciPage({ searchParams }: { searchParams: Record<string, string> }) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q ?? ''

  let countSql = 'SELECT COUNT(DISTINCT p.id) as count FROM people p LEFT JOIN show_people sp ON p.id = sp.person_id'
  if (q) countSql += ' WHERE p.name LIKE ?'
  const countResult = await dbGet(countSql, q ? [`%${q}%`] : [])
  const total = Number((countResult as any)?.count ?? 0)

  const people = await dbAll(`
    SELECT p.*, COUNT(DISTINCT sp.show_id) as show_count
    FROM people p LEFT JOIN show_people sp ON p.id = sp.person_id
    ${q ? 'WHERE p.name LIKE ?' : ''}
    GROUP BY p.id ORDER BY p.name
    LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}
  `, q ? [`%${q}%`] : [])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Herci & tvůrci ({total})</h1>
        <div className="flex gap-2">
          <SyncAllPeopleButton />
          <Link href="/admin/herci/pridat" className="btn-primary">+ Přidat</Link>
        </div>
      </div>
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Hledat jméno..." className="input max-w-xs text-sm" />
        <button type="submit" className="btn-secondary text-sm">Hledat</button>
      </form>
      <AdminPeopleTable people={people as any} />
      <Pagination page={page} total={total} perPage={PER_PAGE} searchParams={searchParams} />
    </div>
  )
}
