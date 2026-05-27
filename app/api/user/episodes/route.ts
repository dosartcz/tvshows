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

  const { episode_id, watched } = await req.json()
  if (!episode_id) return NextResponse.json({ error: 'episode_id required' }, { status: 400 })

  if (watched) {
    await dbRun(
      'INSERT OR IGNORE INTO user_episodes (user_id, episode_id) VALUES (?, ?)',
      [userId, episode_id]
    )
  } else {
    await dbRun(
      'DELETE FROM user_episodes WHERE user_id = ? AND episode_id = ?',
      [userId, episode_id]
    )
  }

  return NextResponse.json({ ok: true })
}
