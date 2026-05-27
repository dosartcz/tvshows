import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbRun } from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbRun('DELETE FROM articles WHERE id = ?', [Number(params.id)])
  return NextResponse.json({ ok: true })
}
