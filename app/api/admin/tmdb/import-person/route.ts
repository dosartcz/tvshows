import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { importPerson, searchPerson } from '@/lib/tmdb'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  if (!q) return NextResponse.json([])

  const results = await searchPerson(q)
  return NextResponse.json(results)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id } = await req.json()
  const personId = await importPerson(Number(tmdb_id))
  return NextResponse.json({ id: personId })
}
