import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncEpisodes } from '@/lib/tmdb'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await syncEpisodes(Number(params.id))
  return NextResponse.json({ ok: true })
}
