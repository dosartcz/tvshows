import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun, slugify } from '@/lib/db'

export async function GET() {
  const people = await dbAll(`
    SELECT p.*, COUNT(DISTINCT sp.show_id) as show_count
    FROM people p LEFT JOIN show_people sp ON p.id = sp.person_id
    GROUP BY p.id ORDER BY p.name
  `)
  return NextResponse.json(people)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { lastId } = await dbRun(
    `INSERT INTO people (name, slug, bio, photo_url, birth_date, nationality) VALUES (?, ?, ?, ?, ?, ?)`,
    [body.name, slugify(body.name), body.bio ?? null,
      body.photo_url ?? null, body.birth_date ?? null, body.nationality ?? null]
  )
  return NextResponse.json({ id: lastId })
}
