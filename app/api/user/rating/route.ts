import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbRun } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session!.user as any).id as number

  const { show_id, rating } = await req.json()
  if (!show_id) return NextResponse.json({ error: 'show_id required' }, { status: 400 })

  if (rating === null) {
    await dbRun(
      'DELETE FROM user_show_ratings WHERE user_id = ? AND show_id = ?',
      [userId, show_id]
    )
  } else {
    if (![-1, 0, 1].includes(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }
    await dbRun(
      `INSERT INTO user_show_ratings (user_id, show_id, rating) VALUES (?, ?, ?)
       ON CONFLICT(user_id, show_id) DO UPDATE SET rating = excluded.rating, rated_at = datetime('now')`,
      [userId, show_id, rating]
    )
  }

  return NextResponse.json({ ok: true })
}
