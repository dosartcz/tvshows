import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll } from '@/lib/db'
import { syncTrailer } from '@/lib/tmdb'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shows = await dbAll<{ id: number }>('SELECT id FROM shows WHERE trailer_key IS NULL ORDER BY id')
  let updated = 0
  for (const show of shows) {
    await syncTrailer(show.id).catch(() => null)
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}
