import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbGet } from '@/lib/db'
import { syncOmdbRatings } from '@/lib/omdb'
import { syncRatings } from '@/lib/tmdb'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  const show = await dbGet<{ id: number; imdb_id: string | null }>('SELECT id, imdb_id FROM shows WHERE id = ?', [id])
  if (!show) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Sync TMDb ratings
  await syncRatings(id)

  // Sync OMDb ratings (RT + Metacritic)
  let omdb = null
  if (show.imdb_id) {
    omdb = await syncOmdbRatings(id, show.imdb_id)
  }

  return NextResponse.json({ ok: true, omdb })
}
