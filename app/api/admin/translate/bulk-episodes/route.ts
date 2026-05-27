import { NextResponse } from 'next/server'
import { dbAll, dbRun } from '@/lib/db'
import { getEpisodeTranslationCS } from '@/lib/tmdb'

export async function POST() {
  const episodes = await dbAll<{ id: number; show_tmdb_id: number; season_number: number; episode_number: number }>(
    `SELECT e.id, s.tmdb_id as show_tmdb_id, sea.season_number, e.episode_number
     FROM episodes e
     JOIN seasons sea ON e.season_id = sea.id
     JOIN shows s ON e.show_id = s.id
     WHERE s.tmdb_id IS NOT NULL AND e.description IS NOT NULL AND e.description != ''
       AND e.description_cs IS NULL
     LIMIT 500`
  )

  let translated = 0
  let skipped = 0
  const errors: string[] = []

  for (const ep of episodes) {
    try {
      const description_cs = await getEpisodeTranslationCS(ep.show_tmdb_id, ep.season_number, ep.episode_number)
      // Přeloženo → uložit text, TMDB nemá CS → uložit '' aby se příště přeskočilo
      await dbRun('UPDATE episodes SET description_cs = ? WHERE id = ?', [description_cs ?? '', ep.id])
      if (description_cs) translated++
      else skipped++
    } catch (e) {
      errors.push(`episode #${ep.id}: ${e}`)
    }
  }

  return NextResponse.json({ translated, skipped, total: episodes.length, errors })
}
