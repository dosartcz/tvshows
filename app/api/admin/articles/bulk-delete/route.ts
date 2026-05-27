import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbRun } from '@/lib/db'

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'No ids' }, { status: 400 })

  const placeholders = ids.map(() => '?').join(', ')
  await dbRun(`DELETE FROM articles WHERE id IN (${placeholders})`, ids)
  return NextResponse.json({ ok: true, deleted: ids.length })
}
