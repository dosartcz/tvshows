import { dbGet } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Dashboard' }
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [shows, people, articles, franchises] = await Promise.all([
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM shows'),
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM people'),
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM articles'),
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM franchises'),
  ])

  const stats = [
    { label: 'Seriály', value: shows?.c ?? 0 },
    { label: 'Herci & tvůrci', value: people?.c ?? 0 },
    { label: 'Články', value: articles?.c ?? 0 },
    { label: 'Franchise', value: franchises?.c ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <p className="text-3xl font-bold text-amber-400">{s.value}</p>
            <p className="text-gray-400 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
