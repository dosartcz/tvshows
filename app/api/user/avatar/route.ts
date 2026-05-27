import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun } from '@/lib/db'

export async function GET() {
  try {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as number | null

  let people

  if (userId) {
    // Herci a tvůrci ze seriálů kde user sledoval alespoň jednu epizodu
    people = await dbAll<{ id: number; name: string; slug: string; photo_url: string }>(
      `SELECT DISTINCT p.id, p.name, p.slug, p.photo_url
       FROM people p
       JOIN show_people sp ON sp.person_id = p.id
       JOIN episodes e ON e.show_id = sp.show_id
       JOIN user_episodes ue ON ue.episode_id = e.id
       WHERE ue.user_id = ? AND p.photo_url IS NOT NULL AND p.active = 1
       ORDER BY (
         SELECT COUNT(*) FROM user_episodes ue2
         JOIN episodes e2 ON e2.id = ue2.episode_id
         JOIN show_people sp2 ON sp2.show_id = e2.show_id
         WHERE sp2.person_id = p.id AND ue2.user_id = ?
       ) DESC, p.name`,
      [userId, userId]
    )
    // Fallback: pokud user ještě nic nesled, nabídni všechny s fotkou
    if (people.length === 0) {
      people = await dbAll<{ id: number; name: string; slug: string; photo_url: string }>(
        `SELECT id, name, slug, photo_url FROM people
         WHERE photo_url IS NOT NULL AND active = 1
         ORDER BY RANDOM() LIMIT 96`
      )
    }
  } else {
    // Fallback pro případ bez session
    people = await dbAll<{ id: number; name: string; slug: string; photo_url: string }>(
      `SELECT id, name, slug, photo_url FROM people
       WHERE photo_url IS NOT NULL AND active = 1
       ORDER BY RANDOM() LIMIT 96`
    )
  }

  return NextResponse.json(people)
  } catch (err) {
    console.error('avatar GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session!.user as any).id as number
  const { avatar_url } = await req.json()
  if (!avatar_url || typeof avatar_url !== 'string') {
    return NextResponse.json({ error: 'Neplatná URL' }, { status: 400 })
  }
  await dbRun('UPDATE users SET avatar_url = ? WHERE id = ?', [avatar_url, userId])
  return NextResponse.json({ ok: true })
}
