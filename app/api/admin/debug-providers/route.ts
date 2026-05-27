import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tmdb_id = req.nextUrl.searchParams.get('tmdb_id')
  if (!tmdb_id) return NextResponse.json({ error: 'tmdb_id required' }, { status: 400 })

  const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdb_id}/watch/providers`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}` }
  })
  const data = await res.json()
  return NextResponse.json(data?.results ?? {})
}
