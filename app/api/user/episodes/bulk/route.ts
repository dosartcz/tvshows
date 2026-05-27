import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbRun, getClient } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session!.user as any).id as number

  const { episode_ids, watched } = await req.json()
  if (!Array.isArray(episode_ids) || episode_ids.length === 0) {
    return NextResponse.json({ error: 'episode_ids required' }, { status: 400 })
  }

  const db = getClient()
  if (watched) {
    const statements = episode_ids.map((id: number) => ({
      sql: 'INSERT OR IGNORE INTO user_episodes (user_id, episode_id) VALUES (?, ?)',
      args: [userId, id],
    }))
    await db.batch(statements, 'write')
  } else {
    const placeholders = episode_ids.map(() => '?').join(',')
    await dbRun(
      `DELETE FROM user_episodes WHERE user_id = ? AND episode_id IN (${placeholders})`,
      [userId, ...episode_ids]
    )
  }

  return NextResponse.json({ ok: true })
}
