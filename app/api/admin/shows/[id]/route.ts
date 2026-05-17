import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbGet, dbRun } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const show = await dbGet('SELECT * FROM shows WHERE id = ?', [params.id])
  if (!show) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(show)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['description', 'description_cs', 'rating_imdb', 'rating_tmdb',
    'franchise_id', 'status', 'network', 'country', 'poster_url', 'backdrop_url']
  const fields = allowed.filter(f => f in body)
  if (fields.length === 0) return NextResponse.json({ ok: true })

  const sets = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => body[f] ?? null)
  await dbRun(`UPDATE shows SET ${sets} WHERE id = ?`, [...vals, params.id])
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbRun('DELETE FROM shows WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
