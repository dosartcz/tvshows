import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll } from '@/lib/db'
import { syncOmdbRatings } from '@/lib/omdb'
import { syncRatings } from '@/lib/tmdb'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shows = await dbAll<{ id: number; imdb_id: string | null }>(
    'SELECT id, imdb_id FROM shows ORDER BY id'
  )

  let updated = 0
  for (const show of shows) {
    await syncRatings(show.id).catch(() => null)
    if (show.imdb_id) {
      await syncOmdbRatings(show.id, show.imdb_id).catch(() => null)
    }
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
