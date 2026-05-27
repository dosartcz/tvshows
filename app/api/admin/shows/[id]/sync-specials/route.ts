import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncSpecials } from '@/lib/tmdb'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const result = await syncSpecials(Number(params.id))
  return NextResponse.json(result)
}
