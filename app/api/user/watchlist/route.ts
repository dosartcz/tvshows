import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session!.user as any).id as number

  const shows = await dbAll<{ id: number; title: string; slug: string; poster_url: string | null }>(
    `SELECT s.id, s.title, s.slug, s.poster_url
     FROM user_watchlist uw
     JOIN shows s ON uw.show_id = s.id
     WHERE uw.user_id = ?
     ORDER BY uw.added_at DESC
     LIMIT 8`,
    [userId]
  )

  return NextResponse.json(shows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session!.user as any).id as number

  const { show_id, add } = await req.json()
  if (!show_id) return NextResponse.json({ error: 'show_id required' }, { status: 400 })

  if (add) {
    await dbRun(
      'INSERT OR IGNORE INTO user_watchlist (user_id, show_id) VALUES (?, ?)',
      [userId, show_id]
    )
  } else {
    await dbRun(
      'DELETE FROM user_watchlist WHERE user_id = ? AND show_id = ?',
      [userId, show_id]
    )
  }

  return NextResponse.json({ ok: true })
}
