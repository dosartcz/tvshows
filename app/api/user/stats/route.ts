import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbGet } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id ?? null
  if (!userId) return NextResponse.json({ episodes: 0, mins: 0, completed: 0, watching: 0, topActor: null, topActress: null, topActorVoice: null, topActressVoice: null, topDirector: null, topWriter: null })

  const [episodesRow, timeRow, completedRow, watchingRow, topDirector, topWriter, topActress, topActor, topActressVoice, topActorVoice] = await Promise.all([
    dbGet<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM user_episodes WHERE user_id = ?',
      [userId]
    ),
    dbGet<{ mins: number }>(`
      SELECT COALESCE(SUM(e.runtime), 0) as mins
      FROM user_episodes ue
      JOIN episodes e ON ue.episode_id = e.id
      WHERE ue.user_id = ? AND e.runtime IS NOT NULL
    `, [userId]),
    dbGet<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM (
        SELECT e.show_id
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        JOIN seasons sea ON e.season_id = sea.id
        WHERE ue.user_id = ? AND sea.season_number > 0
        GROUP BY e.show_id
        HAVING COUNT(DISTINCT ue.episode_id) >= (
          SELECT COUNT(*) FROM episodes e2 JOIN seasons s2 ON e2.season_id = s2.id
          WHERE e2.show_id = e.show_id AND s2.season_number > 0
        ) AND (
          SELECT COUNT(*) FROM episodes e2 JOIN seasons s2 ON e2.season_id = s2.id
          WHERE e2.show_id = e.show_id AND s2.season_number > 0
        ) > 0
      )
    `, [userId]),
    dbGet<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM (
        SELECT e.show_id
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        JOIN seasons sea ON e.season_id = sea.id
        WHERE ue.user_id = ? AND sea.season_number > 0
        GROUP BY e.show_id
        HAVING COUNT(DISTINCT ue.episode_id) < (
          SELECT COUNT(*) FROM episodes e2 JOIN seasons s2 ON e2.season_id = s2.id
          WHERE e2.show_id = e.show_id AND s2.season_number > 0
        )
      )
    `, [userId]),
    // topDirector: role director nebo creator
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, COUNT(DISTINCT ue.episode_id) as cnt
      FROM user_episodes ue
      JOIN episode_people ep ON ep.episode_id = ue.episode_id
      JOIN people p ON ep.person_id = p.id
      WHERE ue.user_id = ? AND ep.role IN ('director', 'creator')
      GROUP BY p.id
      ORDER BY cnt DESC, RANDOM()
      LIMIT 1
    `, [userId]),
    // topWriter: role writer
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, COUNT(DISTINCT ue.episode_id) as cnt
      FROM user_episodes ue
      JOIN episode_people ep ON ep.episode_id = ue.episode_id
      JOIN people p ON ep.person_id = p.id
      WHERE ue.user_id = ? AND ep.role = 'writer'
      GROUP BY p.id
      ORDER BY cnt DESC, RANDOM()
      LIMIT 1
    `, [userId]),
    // topActress: gender=1, cast bez voice (detekce přes show_people, počty COALESCE)
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, SUM(ep_count) as cnt
      FROM (
        SELECT sp.person_id,
          CASE
            WHEN COUNT(DISTINCT ep.episode_id) > 0 THEN COUNT(DISTINCT ep.episode_id)
            WHEN COUNT(DISTINCT ue.episode_id) < sp.episode_count THEN COUNT(DISTINCT ue.episode_id)
            ELSE sp.episode_count
          END as ep_count
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        JOIN show_people sp ON sp.show_id = e.show_id
          AND sp.role = 'actor'
          AND (sp.character_name IS NULL OR sp.character_name NOT LIKE '%(voice)%')
        LEFT JOIN episode_people ep ON ep.episode_id = ue.episode_id
          AND ep.person_id = sp.person_id AND ep.role = 'cast'
        WHERE ue.user_id = ?
        GROUP BY sp.person_id, sp.show_id
      ) sub
      JOIN people p ON p.id = sub.person_id
      WHERE p.gender = 1
        AND NOT EXISTS (SELECT 1 FROM show_people sp2 WHERE sp2.person_id = p.id AND sp2.role = 'creator')
      GROUP BY p.id
      ORDER BY cnt DESC, RANDOM()
      LIMIT 1
    `, [userId]),
    // topActor: gender=2, cast bez voice (detekce přes show_people, počty COALESCE)
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, SUM(ep_count) as cnt
      FROM (
        SELECT sp.person_id,
          CASE
            WHEN COUNT(DISTINCT ep.episode_id) > 0 THEN COUNT(DISTINCT ep.episode_id)
            WHEN COUNT(DISTINCT ue.episode_id) < sp.episode_count THEN COUNT(DISTINCT ue.episode_id)
            ELSE sp.episode_count
          END as ep_count
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        JOIN show_people sp ON sp.show_id = e.show_id
          AND sp.role = 'actor'
          AND (sp.character_name IS NULL OR sp.character_name NOT LIKE '%(voice)%')
        LEFT JOIN episode_people ep ON ep.episode_id = ue.episode_id
          AND ep.person_id = sp.person_id AND ep.role = 'cast'
        WHERE ue.user_id = ?
        GROUP BY sp.person_id, sp.show_id
      ) sub
      JOIN people p ON p.id = sub.person_id
      WHERE p.gender = 2
        AND NOT EXISTS (SELECT 1 FROM show_people sp2 WHERE sp2.person_id = p.id AND sp2.role = 'creator')
      GROUP BY p.id
      ORDER BY cnt DESC, RANDOM()
      LIMIT 1
    `, [userId]),
    // topActressVoice: gender=1, voice detekce přes show_people, počty COALESCE
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, SUM(ep_count) as cnt
      FROM (
        SELECT sp.person_id,
          CASE
            WHEN COUNT(DISTINCT ep.episode_id) > 0 THEN COUNT(DISTINCT ep.episode_id)
            WHEN COUNT(DISTINCT ue.episode_id) < sp.episode_count THEN COUNT(DISTINCT ue.episode_id)
            ELSE sp.episode_count
          END as ep_count
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        JOIN show_people sp ON sp.show_id = e.show_id
          AND sp.role = 'actor'
          AND sp.character_name LIKE '%(voice)%'
        LEFT JOIN episode_people ep ON ep.episode_id = ue.episode_id
          AND ep.person_id = sp.person_id AND ep.role = 'cast'
        WHERE ue.user_id = ?
        GROUP BY sp.person_id, sp.show_id
      ) sub
      JOIN people p ON p.id = sub.person_id
      WHERE p.gender = 1
        AND NOT EXISTS (SELECT 1 FROM show_people sp2 WHERE sp2.person_id = p.id AND sp2.role = 'creator')
      GROUP BY p.id
      ORDER BY cnt DESC, RANDOM()
      LIMIT 1
    `, [userId]),
    // topActorVoice: gender=2, voice detekce přes show_people, počty COALESCE
    dbGet<{ name: string; slug: string; photo_url: string | null; cnt: number }>(`
      SELECT p.name, p.slug, p.photo_url, SUM(ep_count) as cnt
      FROM (
        SELECT sp.person_id,
          CASE
            WHEN COUNT(DISTINCT ep.episode_id) > 0 THEN COUNT(DISTINCT ep.episode_id)
            WHEN COUNT(DISTINCT ue.episode_id) < sp.episode_count THEN COUNT(DISTINCT ue.episode_id)
            ELSE sp.episode_count
          END as ep_count
        FROM user_episodes ue
        JOIN episodes e ON ue.episode_id = e.id
        JOIN show_people sp ON sp.show_id = e.show_id
          AND sp.role = 'actor'
          AND sp.character_name LIKE '%(voice)%'
        LEFT JOIN episode_people ep ON ep.episode_id = ue.episode_id
          AND ep.person_id = sp.person_id AND ep.role = 'cast'
        WHERE ue.user_id = ?
        GROUP BY sp.person_id, sp.show_id
      ) sub
      JOIN people p ON p.id = sub.person_id
      WHERE p.gender = 2
        AND NOT EXISTS (SELECT 1 FROM show_people sp2 WHERE sp2.person_id = p.id AND sp2.role = 'creator')
      GROUP BY p.id
      ORDER BY cnt DESC, RANDOM()
      LIMIT 1
    `, [userId]),
  ])

  return NextResponse.json({
    episodes: episodesRow?.cnt ?? 0,
    mins: timeRow?.mins ?? 0,
    completed: completedRow?.cnt ?? 0,
    watching: watchingRow?.cnt ?? 0,
    topDirector: topDirector ?? null,
    topWriter: topWriter ?? null,
    topActress: topActress ?? null,
    topActor: topActor ?? null,
    topActressVoice: topActressVoice ?? null,
    topActorVoice: topActorVoice ?? null,
  })
}
