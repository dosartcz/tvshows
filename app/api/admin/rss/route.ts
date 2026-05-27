import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, dbRun } from '@/lib/db'
import { syncRssSources, parseRss } from '@/lib/rss'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sources = await dbAll('SELECT * FROM rss_sources ORDER BY name')
  return NextResponse.json(sources)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'sync') {
    const result = await syncRssSources()
    return NextResponse.json(result)
  }

  if (body.action === 'debug') {
    const sources = await dbAll<{ url: string; excluded_categories: string }>('SELECT url, excluded_categories FROM rss_sources WHERE active = 1')
    const shows = await dbAll<{ id: number; title: string }>('SELECT id, title FROM shows')
    const result = []
    for (const source of sources) {
      const res = await fetch(source.url, { cache: 'no-store' })
      const xml = await res.text()
      const items = parseRss(xml)
      const excludedCats = (source.excluded_categories || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
      for (const item of items) {
        const hasExcluded = item.categories.some((c: string) => excludedCats.some((ex: string) => c.includes(ex)))
        const matchedShows = shows.filter((s: { id: number; title: string }) => {
          const escaped = s.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const pattern = s.title.length <= 4
            ? new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i')
            : new RegExp(escaped, 'i')
          return pattern.test(item.title) || pattern.test(item.description)
        })
        result.push({
          title: item.title,
          categories: item.categories,
          skippedByCategory: hasExcluded,
          matchedShows: matchedShows.map(s => s.title),
        })
      }
    }
    return NextResponse.json(result)
  }

  if (body.action === 'add') {
    await dbRun(
      `INSERT INTO rss_sources (name, url, excluded_categories) VALUES (?, ?, ?)`,
      [body.name, body.url, body.excluded_categories ?? 'recap,recaps']
    )
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete') {
    await dbRun('DELETE FROM rss_sources WHERE id = ?', [body.id])
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'toggle') {
    await dbRun('UPDATE rss_sources SET active = ? WHERE id = ?', [body.active ? 1 : 0, body.id])
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'update') {
    await dbRun('UPDATE rss_sources SET excluded_categories = ? WHERE id = ?', [body.excluded_categories ?? '', body.id])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
