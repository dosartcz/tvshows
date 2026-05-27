import Link from 'next/link'
import { dbAll, dbGet } from '@/lib/db'
import AdminShowsTable from '@/components/AdminShowsTable'
import Pagination from '@/components/Pagination'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin – Seriály' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 50

export default async function AdminSeriályPage({ searchParams }: { searchParams: Record<string, string> }) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q ?? ''

  const countResult = await dbGet(
    `SELECT COUNT(*) as count FROM shows s ${q ? 'WHERE s.title LIKE ?' : ''}`,
    q ? [`%${q}%`] : []
  )
  const total = Number((countResult as any)?.count ?? 0)

  const shows = await dbAll(`
    SELECT s.*, f.name as franchise_name
    FROM shows s LEFT JOIN franchises f ON s.franchise_id = f.id
    ${q ? 'WHERE s.title LIKE ?' : ''}
    ORDER BY s.created_at DESC
    LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}
  `, q ? [`%${q}%`] : [])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Seriály ({total})</h1>
        <Link href="/admin/serialy/pridat" className="btn-primary">+ Přidat seriál</Link>
      </div>
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Hledat seriál..." className="input max-w-xs text-sm" />
        <button type="submit" className="btn-secondary text-sm">Hledat</button>
      </form>
      <AdminShowsTable shows={shows as any} />
      <Pagination page={page} total={total} perPage={PER_PAGE} searchParams={searchParams} />
    </div>
  )
}
