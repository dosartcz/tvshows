import { NextResponse } from 'next/server'
import { fetchAllFeeds } from '@/lib/rss'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST() {
  try {
    const result = await fetchAllFeeds()
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Allow Vercel Cron (GET)
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await fetchAllFeeds()
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
