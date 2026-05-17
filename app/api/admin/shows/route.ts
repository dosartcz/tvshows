import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun, slugify } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shows = await dbAll(`
    SELECT s.*, f.name as franchise_name
    FROM shows s LEFT JOIN franchises f ON s.franchise_id = f.id
    ORDER BY s.created_at DESC
  `)
  return NextResponse.json(shows)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { lastId } = await dbRun(
    `INSERT INTO shows (title, slug, description, status, country, network, franchise_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [slugify(body.title), body.title, body.description ?? null,
      body.status ?? null, body.country ?? null, body.network ?? null, body.franchise_id ?? null]
  )
  return NextResponse.json({ id: lastId })
}
