import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun, slugify } from '@/lib/db'

export async function GET() {
  const franchises = await dbAll('SELECT * FROM franchises ORDER BY name')
  return NextResponse.json(franchises)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, logo_url } = await req.json()
  const { lastId } = await dbRun(
    'INSERT INTO franchises (name, slug, description, logo_url) VALUES (?, ?, ?, ?)',
    [name, slugify(name), description ?? null, logo_url ?? null]
  )
  return NextResponse.json({ id: lastId })
}
