import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { importShow } from '@/lib/tmdb'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id } = await req.json()
  if (!tmdb_id) return NextResponse.json({ error: 'tmdb_id required' }, { status: 400 })

  const showId = await importShow(Number(tmdb_id))
  return NextResponse.json({ id: showId })
}
