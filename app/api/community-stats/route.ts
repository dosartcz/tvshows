import { NextResponse } from 'next/server'
import { dbGet } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [episodesRow, timeRow, completedRow, watchingRow, topActor, topCreator] = await Promise.all([
    dbGet<{ cnt: number }>('SELECT COUNT(*) as cnt FROM user_episodes'),
    dbGet<{ mins: number }>(`
      SELECT COALESCE(SUM(e.runtime), 0) as mins
      FROM user_episodes ue
      JOIN episodes e ON ue.episode_id = e.id
      WHERE e.runtime IS NOT NULL
    `),
    dbGet<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM (
        SELECT ue.user_id, e.show_id
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        GROUP BY ue.user_id, e.show_id
        HAVING COUNT(DISTINCT ue.episode_id) >= (SELECT COUNT(*) FROM episodes WHERE show_id = e.show_id AND (SELECT COUNT(*) FROM episodes WHERE show_id = e.show_id) > 0)
      )
    `),
    dbGet<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM (
        SELECT ue.user_id, e.show_id
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        GROUP BY ue.user_id, e.show_id
        HAVING COUNT(DISTINCT ue.episode_id) < (SELECT COUNT(*) FROM episodes WHERE show_id = e.show_id)
      )
    `),
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, COUNT(*) as cnt
      FROM user_episodes ue
      JOIN episode_people ep ON ep.episode_id = ue.episode_id
      JOIN people p ON ep.person_id = p.id
      WHERE ep.role = 'cast'
      GROUP BY p.id
      ORDER BY cnt DESC
      LIMIT 1
    `),
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, COUNT(*) as cnt
      FROM user_episodes ue
      JOIN episode_people ep ON ep.episode_id = ue.episode_id
      JOIN people p ON ep.person_id = p.id
      WHERE ep.role IN ('director', 'writer', 'creator')
      GROUP BY p.id
      ORDER BY cnt DESC
      LIMIT 1
    `),
  ])

  return NextResponse.json({
    episodes: episodesRow?.cnt ?? 0,
    mins: timeRow?.mins ?? 0,
    completed: completedRow?.cnt ?? 0,
    watching: watchingRow?.cnt ?? 0,
    topActor: topActor ?? null,
    topCreator: topCreator ?? null,
  })
}
