import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll } from '@/lib/db'
import { syncWatchProviders } from '@/lib/tmdb'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shows = await dbAll<{ id: number, title: string }>('SELECT id, title FROM shows ORDER BY id')
  const errors: string[] = []

  for (const show of shows) {
    try {
      await syncWatchProviders(show.id)
    } catch (e) {
      errors.push(`${show.title}: ${e}`)
    }
    // Pauza mezi cally, aby TMDB rate limit nepřekročil
    await new Promise(r => setTimeout(r, 250))
  }

  return NextResponse.json({ ok: true, updated: shows.length, errors })
}
