import { NextResponse } from 'next/server'
import { dbAll, dbRun } from '@/lib/db'
import { getPersonTranslationCS } from '@/lib/tmdb'

export async function POST() {
  const people = await dbAll<{ id: number; tmdb_id: number }>(
    `SELECT id, tmdb_id FROM people WHERE tmdb_id IS NOT NULL AND bio IS NOT NULL AND bio_cs IS NULL`
  )

  let translated = 0
  let skipped = 0
  const errors: string[] = []

  for (const person of people) {
    try {
      const bio_cs = await getPersonTranslationCS(person.tmdb_id)
      await dbRun('UPDATE people SET bio_cs = ? WHERE id = ?', [bio_cs ?? '', person.id])
      if (bio_cs) translated++
      else skipped++
    } catch (e) {
      errors.push(`person #${person.id}: ${e}`)
    }
  }

  return NextResponse.json({ translated, skipped, total: people.length, errors })
}
