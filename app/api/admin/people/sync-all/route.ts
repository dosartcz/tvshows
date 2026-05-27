import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun } from '@/lib/db'

const BASE = 'https://api.themoviedb.org/3'

function headers() {
  return {
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Jen herci s tmdb_id ale bez biografie
  const people = await dbAll<{ id: number; tmdb_id: number }>(
    "SELECT id, tmdb_id FROM people WHERE tmdb_id IS NOT NULL AND (bio IS NULL OR bio = '') ORDER BY id"
  )

  let updated = 0
  for (const person of people) {
    try {
      const res = await fetch(`${BASE}/person/${person.tmdb_id}?language=en-US`, { headers: headers() })
      if (!res.ok) continue
      const data = await res.json()

      await dbRun(
        `UPDATE people SET
          bio = ?,
          photo_url = COALESCE(photo_url, ?),
          birth_date = ?,
          nationality = ?
         WHERE id = ?`,
        [
          data.biography || null,
          data.profile_path ? `https://image.tmdb.org/t/p/w185${data.profile_path}` : null,
          data.birthday || null,
          data.place_of_birth || null,
          person.id,
        ]
      )
      updated++
    } catch {
      // přeskočit a pokračovat
    }
  }

  return NextResponse.json({ ok: true, updated, total: people.length })
}
