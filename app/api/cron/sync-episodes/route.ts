import { NextResponse } from 'next/server'
import { dbAll } from '@/lib/db'
import { syncEpisodes, syncRatings } from '@/lib/tmdb'
import { syncOmdbRatings } from '@/lib/omdb'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const shows = await dbAll<{ id: number; imdb_id: string | null }>(
    `SELECT id, imdb_id FROM shows WHERE active = 1 AND (status IS NULL OR status != 'Ended')`
  )

  let synced = 0
  let errors = 0

  for (const show of shows) {
    try {
      await syncEpisodes(show.id)
      await syncRatings(show.id)
      if (show.imdb_id) await syncOmdbRatings(show.id, show.imdb_id).catch(() => null)
      synced++
    } catch {
      errors++
    }
  }

  return NextResponse.json({ synced, errors, total: shows.length })
}
