import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const articles = await dbAll(`
    SELECT a.*, GROUP_CONCAT(s.title, ', ') as show_titles
    FROM articles a
    LEFT JOIN article_shows ars ON a.id = ars.article_id
    LEFT JOIN shows s ON ars.show_id = s.id
    GROUP BY a.id
    ORDER BY a.published_at DESC
    LIMIT 200
  `)
  return NextResponse.json(articles)
}
