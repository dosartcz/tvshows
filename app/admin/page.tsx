import { dbGet } from '@/lib/db'
import type { Metadata } from 'next'
import SyncGenresButton from '@/components/SyncGenresButton'
import SyncKeywordsButton from '@/components/SyncKeywordsButton'
import SyncPopularityButton from '@/components/SyncPopularityButton'
import SyncWatchProvidersButton from '@/components/SyncWatchProvidersButton'
import BulkTranslateButton from '@/components/BulkTranslateButton'
import BulkTranslatePeopleButton from '@/components/BulkTranslatePeopleButton'
import BulkTranslateEpisodesButton from '@/components/BulkTranslateEpisodesButton'
import SyncLogosButton from '@/components/SyncLogosButton'
import SyncEpisodeCastButton from '@/components/SyncEpisodeCastButton'

export const metadata: Metadata = { title: 'Admin Dashboard' }
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [shows, people, articles, franchises, users] = await Promise.all([
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM shows'),
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM people'),
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM articles'),
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM franchises'),
    dbGet<{ c: number }>('SELECT COUNT(*) as c FROM users'),
  ])

  const stats = [
    { label: 'Seriály', value: shows?.c ?? 0 },
    { label: 'Herci & tvůrci', value: people?.c ?? 0 },
    { label: 'Aktuality', value: articles?.c ?? 0 },
    { label: 'Franchise', value: franchises?.c ?? 0 },
    { label: 'Uživatelé', value: users?.c ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <p className="text-3xl font-bold text-accent">{s.value}</p>
            <p className="text-gray-400 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <SyncGenresButton />
        <SyncKeywordsButton />
        <SyncPopularityButton />
        <SyncWatchProvidersButton />
        <BulkTranslateButton />
        <BulkTranslateEpisodesButton />
        <BulkTranslatePeopleButton />
        <SyncLogosButton />
        <SyncEpisodeCastButton />
      </div>
    </div>
  )
}
