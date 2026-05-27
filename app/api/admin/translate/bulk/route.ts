import { NextResponse } from 'next/server'
import { dbAll, dbRun } from '@/lib/db'
import { getShowTranslationCS } from '@/lib/tmdb'

export async function POST() {
  const shows = await dbAll<{ id: number; tmdb_id: number }>(
    `SELECT id, tmdb_id FROM shows WHERE tmdb_id IS NOT NULL AND active = 1 AND description_cs IS NULL`
  )

  let translated = 0
  let skipped = 0
  const errors: string[] = []

  for (const show of shows) {
    try {
      const description_cs = await getShowTranslationCS(show.tmdb_id)
      await dbRun('UPDATE shows SET description_cs = ? WHERE id = ?', [description_cs ?? '', show.id])
      if (description_cs) translated++
      else skipped++
    } catch (e) {
      errors.push(`show #${show.id}: ${e}`)
    }
  }

  return NextResponse.json({ translated, skipped, total: shows.length, errors })
}
