import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbRun } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { show_id } = await req.json()
  await dbRun('INSERT OR IGNORE INTO article_shows (article_id, show_id) VALUES (?, ?)',
    [params.id, show_id])
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { show_id } = await req.json()
  await dbRun('DELETE FROM article_shows WHERE article_id = ? AND show_id = ?',
    [params.id, show_id])
  return NextResponse.json({ ok: true })
}
