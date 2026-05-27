import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncAllLogos } from '@/lib/tmdb'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const synced = await syncAllLogos()
    return NextResponse.json({ synced })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
