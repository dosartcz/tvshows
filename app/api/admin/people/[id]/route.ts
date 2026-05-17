import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbRun } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const fields = ['name', 'bio', 'bio_cs', 'photo_url', 'birth_date', 'nationality'].filter(f => f in body)
  if (fields.length) {
    const sets = fields.map(f => `${f} = ?`).join(', ')
    await dbRun(`UPDATE people SET ${sets} WHERE id = ?`,
      [...fields.map(f => body[f]), params.id])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbRun('DELETE FROM people WHERE id = ?', [params.id])
  return NextResponse.json({ ok: true })
}
