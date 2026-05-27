import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll } from '@/lib/db'
import { parseRss } from '@/lib/rss'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sources = await dbAll<{ url: string; excluded_categories: string }>(
    'SELECT url, excluded_categories FROM rss_sources WHERE active = 1'
  )
  const shows = await dbAll<{ id: number; title: string }>('SELECT id, title FROM shows')

  const result = []
  for (const source of sources) {
    const res = await fetch(source.url, { cache: 'no-store' })
    const xml = await res.text()
    const items = parseRss(xml)
    const excludedCats = (source.excluded_categories || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    for (const item of items) {
      const hasExcluded = item.categories.some(c => excludedCats.some(ex => c.includes(ex)))
      const matchedShows = shows.filter(s => {
        const t = s.title.toLowerCase()
        return item.title.toLowerCase().includes(t) || item.description.toLowerCase().includes(t)
      })
      result.push({
        title: item.title,
        categories: item.categories,
        skippedByCategory: hasExcluded,
        matchedShows: matchedShows.map(s => s.title),
      })
    }
  }

  return NextResponse.json(result, {
    headers: { 'Content-Type': 'application/json' }
  })
}
