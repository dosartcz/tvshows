import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll } from '@/lib/db'
import { importEpisodeCredits } from '@/lib/tmdb'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { show_id } = await req.json().catch(() => ({}))

  // Epizody kde chybí cast v episode_people
  const query = show_id
    ? `SELECT e.id, e.episode_number, sea.season_number, s.tmdb_id as show_tmdb_id
       FROM episodes e
       JOIN seasons sea ON e.season_id = sea.id
       JOIN shows s ON e.show_id = s.id
       WHERE e.show_id = ? AND s.tmdb_id IS NOT NULL AND sea.season_number > 0
         AND NOT EXISTS (SELECT 1 FROM episode_people ep WHERE ep.episode_id = e.id AND ep.role = 'cast')
       ORDER BY sea.season_number, e.episode_number`
    : `SELECT e.id, e.episode_number, sea.season_number, s.tmdb_id as show_tmdb_id
       FROM episodes e
       JOIN seasons sea ON e.season_id = sea.id
       JOIN shows s ON e.show_id = s.id
       WHERE s.tmdb_id IS NOT NULL AND sea.season_number > 0 AND s.active = 1
         AND NOT EXISTS (SELECT 1 FROM episode_people ep WHERE ep.episode_id = e.id AND ep.role = 'cast')
       ORDER BY s.id, sea.season_number, e.episode_number
       LIMIT 200`

  const episodes = await dbAll(query, show_id ? [show_id] : [])

  let synced = 0
  let errors = 0
  for (const ep of episodes) {
    try {
      await importEpisodeCredits(ep.id, ep.show_tmdb_id, ep.season_number, ep.episode_number)
      synced++
    } catch {
      errors++
    }
  }

  return NextResponse.json({ synced, errors, total: episodes.length })
}
