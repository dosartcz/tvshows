import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { dbAll, dbGet } from '@/lib/db'
import ShowCard from '@/components/ShowCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const RATING_ICON: Record<number, string> = { '-1': '↓', 0: '○', 1: '↑' } as any

const RatingIcon = ({ rating }: { rating: number }) => {
  if (rating === 1) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
    </svg>
  )
  if (rating === -1) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
    </svg>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  )
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id) redirect('/prihlaseni')
  const userId = (session!.user as any).id as number

  const totalWatched = await dbGet<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM user_episodes WHERE user_id = ?',
    [userId]
  )

  // Watchlist shows (in watchlist and 0 episodes watched)
  const watchlistShows = await dbAll(`
    SELECT s.*, uw.added_at
    FROM user_watchlist uw
    JOIN shows s ON uw.show_id = s.id
    WHERE uw.user_id = ?
    AND NOT EXISTS (
      SELECT 1 FROM user_episodes ue
      JOIN episodes e ON ue.episode_id = e.id
      WHERE e.show_id = s.id AND ue.user_id = ?
    )
    ORDER BY uw.added_at DESC
  `, [userId, userId])

  // Watching shows (>= 1 episode watched, not all) — season 0 excluded from total
  const watchingShows = await dbAll(`
    SELECT s.*,
      COUNT(DISTINCT CASE WHEN sea.season_number > 0 THEN ue.episode_id END) as watched_count,
      (SELECT COUNT(*) FROM episodes e2 JOIN seasons s2 ON e2.season_id = s2.id
       WHERE e2.show_id = s.id AND s2.season_number > 0) as total_episodes
    FROM user_episodes ue
    JOIN episodes e ON ue.episode_id = e.id
    JOIN seasons sea ON e.season_id = sea.id
    JOIN shows s ON e.show_id = s.id
    WHERE ue.user_id = ?
    GROUP BY s.id
    HAVING watched_count < total_episodes
    ORDER BY MAX(ue.watched_at) DESC
  `, [userId])

  // Completed shows (all regular episodes watched) — season 0 excluded
  const completedShows = await dbAll(`
    SELECT s.*,
      COUNT(DISTINCT CASE WHEN sea.season_number > 0 THEN ue.episode_id END) as watched_count,
      (SELECT COUNT(*) FROM episodes e2 JOIN seasons s2 ON e2.season_id = s2.id
       WHERE e2.show_id = s.id AND s2.season_number > 0) as total_episodes
    FROM user_episodes ue
    JOIN episodes e ON ue.episode_id = e.id
    JOIN seasons sea ON e.season_id = sea.id
    JOIN shows s ON e.show_id = s.id
    WHERE ue.user_id = ?
    GROUP BY s.id
    HAVING total_episodes > 0 AND watched_count >= total_episodes
    ORDER BY MAX(ue.watched_at) DESC
  `, [userId])

  const ratings = await dbAll<{ show_id: number; rating: number }>(
    'SELECT show_id, rating FROM user_show_ratings WHERE user_id = ?',
    [userId]
  )
  const ratingMap = new Map(ratings.map(r => [r.show_id, r.rating]))

  function ShowWithRating({ show }: { show: any }) {
    const r = ratingMap.get(show.id)
    return (
      <div className="relative">
        <ShowCard show={show} />
        {r !== undefined && (
          <span className="absolute top-1 right-1 bg-gray-950/80 rounded p-1 text-gray-300">
            <RatingIcon rating={r} />
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Můj profil</h1>
        <Link href="/nastaveni" className="btn-secondary text-sm">Nastavení</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-accent">{totalWatched?.cnt ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Epizod zhlédnuto</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-accent">{watchingShows.length}</p>
          <p className="text-xs text-gray-500 mt-1">Seriálů sleduji</p>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-accent">{completedShows.length}</p>
          <p className="text-xs text-gray-500 mt-1">Seriálů dokončeno</p>
        </div>
      </div>

      {watchlistShows.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Watchlist</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {watchlistShows.map((s: any) => <ShowWithRating key={s.id} show={s} />)}
          </div>
        </section>
      )}

      {watchingShows.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Sleduji</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {watchingShows.map((s: any) => <ShowWithRating key={s.id} show={s} />)}
          </div>
        </section>
      )}

      {completedShows.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Dokončeno</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {completedShows.map((s: any) => <ShowWithRating key={s.id} show={s} />)}
          </div>
        </section>
      )}

      {watchlistShows.length === 0 && watchingShows.length === 0 && completedShows.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">Zatím žádná aktivita</p>
          <Link href="/serialy" className="text-accent hover:text-accent-hover">Procházet seriály →</Link>
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <div className="hidden sm:flex w-full max-w-[728px] h-[90px] bg-gray-900 border border-gray-800 rounded-lg items-center justify-center">
          <span className="text-gray-700 text-xs">Reklama 728×90</span>
        </div>
        <div className="flex sm:hidden w-[320px] h-[50px] bg-gray-900 border border-gray-800 rounded-lg items-center justify-center">
          <span className="text-gray-700 text-xs">Reklama 320×50</span>
        </div>
      </div>
    </div>
  )
}
