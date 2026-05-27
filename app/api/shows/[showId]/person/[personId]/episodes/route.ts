import { NextResponse } from 'next/server'
import { dbAll } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { showId: string; personId: string } }
) {
  const episodes = await dbAll(`
    SELECT e.id, e.episode_number, e.title, e.air_date, sea.season_number, ep.character_name, ep.role
    FROM episode_people ep
    JOIN episodes e ON ep.episode_id = e.id
    JOIN seasons sea ON e.season_id = sea.id
    WHERE e.show_id = ? AND ep.person_id = ?
    ORDER BY sea.season_number, e.episode_number
  `, [params.showId, params.personId])

  return NextResponse.json(episodes)
}
