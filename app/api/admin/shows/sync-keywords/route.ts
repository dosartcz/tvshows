import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll } from '@/lib/db'
import { syncKeywords } from '@/lib/tmdb'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shows = await dbAll<{ id: number }>('SELECT id FROM shows ORDER BY id')
  for (const show of shows) {
    await syncKeywords(show.id).catch(() => null)
  }
  return NextResponse.json({ ok: true, updated: shows.length })
}
