import { dbGet, dbAll } from '@/lib/db'
import { notFound } from 'next/navigation'
import EditShowForm from './EditShowForm'

export const dynamic = 'force-dynamic'

const RATING_ICON: Record<number, JSX.Element> = {
  '-1': <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>,
  0:  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  1:  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>,
} as any

export default async function AdminShowPage({ params }: { params: { id: string } }) {
  const show = await dbGet<any>('SELECT * FROM shows WHERE id = ?', [params.id])
  if (!show) notFound()

  const franchises = await dbAll<{ id: number; name: string }>('SELECT id, name FROM franchises ORDER BY name')

  const ratingAgg = await dbGet<{ total: number; thumbs_up: number; check_mark: number; thumbs_down: number }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
      SUM(CASE WHEN rating = 0 THEN 1 ELSE 0 END) as check_mark,
      SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down
    FROM user_show_ratings WHERE show_id = ?
  `, [params.id])

  const ratings = await dbAll<{ name: string | null; email: string; rating: number; rated_at: string }>(`
    SELECT u.name, u.email, r.rating, r.rated_at
    FROM user_show_ratings r
    JOIN users u ON r.user_id = u.id
    WHERE r.show_id = ?
    ORDER BY r.rated_at DESC
  `, [params.id])

  return (
    <div className="space-y-10">
      <EditShowForm show={show} franchises={franchises} />

      {(ratingAgg?.total ?? 0) > 0 && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-white mb-4">Hodnocení uživatelů</h2>
          <div className="flex gap-4 mb-4">
            <div className="bg-gray-900 rounded-lg border border-gray-800 px-4 py-3 text-center">
              <p className="text-xl font-bold text-white">{ratingAgg!.thumbs_up}</p>
              <div className="flex justify-center mt-1 text-gray-500">{RATING_ICON[1]}</div>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 px-4 py-3 text-center">
              <p className="text-xl font-bold text-white">{ratingAgg!.check_mark}</p>
              <div className="flex justify-center mt-1 text-gray-500">{RATING_ICON[0]}</div>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 px-4 py-3 text-center">
              <p className="text-xl font-bold text-white">{ratingAgg!.thumbs_down}</p>
              <div className="flex justify-center mt-1 text-gray-500">{RATING_ICON[-1]}</div>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 px-4 py-3 text-center">
              <p className="text-xl font-bold text-white">{ratingAgg!.total}</p>
              <p className="text-xs text-gray-500">Celkem</p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Uživatel</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Hodnocení</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {ratings.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-300">{r.name ?? r.email}</td>
                    <td className="px-4 py-2">{RATING_ICON[r.rating]}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(r.rated_at).toLocaleDateString('cs-CZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
