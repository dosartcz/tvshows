import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cast = await dbAll(`
    SELECT p.id, p.name, p.photo_url, sp.role, sp.character_name
    FROM show_people sp JOIN people p ON sp.person_id = p.id
    WHERE sp.show_id = ?
    ORDER BY sp.role, p.name
  `, [params.id])
  return NextResponse.json(cast)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { person_id, role, character_name } = await req.json()
  await dbRun(
    `INSERT OR IGNORE INTO show_people (show_id, person_id, role, character_name) VALUES (?, ?, ?, ?)`,
    [params.id, person_id, role, character_name ?? null]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { person_id, role } = await req.json()
  await dbRun('DELETE FROM show_people WHERE show_id = ? AND person_id = ? AND role = ?',
    [params.id, person_id, role])
  return NextResponse.json({ ok: true })
}
