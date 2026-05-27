import { dbAll, dbRun, getClient } from './db'

interface RssItem {
  title: string
  url: string
  description: string
  imageUrl: string | null
  publishedAt: string | null
  author: string | null
  categories: string[]
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemMatches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))

  for (const match of itemMatches) {
    const block = match[1]

    const title = decodeHtml(extractTag(block, 'title'))
    const url = extractTag(block, 'link') || extractTag(block, 'guid') || ''
    const description = decodeHtml(stripHtml(extractTag(block, 'description') || extractTag(block, 'content:encoded') || ''))
    const pubDate = extractTag(block, 'pubDate')
    const author = extractTag(block, 'dc:creator') || extractTag(block, 'author') || null
    const imageUrl =
      extractAttr(block, 'media:content', 'url') ||
      extractAttr(block, 'media:thumbnail', 'url') ||
      extractAttr(block, 'enclosure', 'url') ||
      null

    const categoryMatches = Array.from(block.matchAll(/<category[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/g))
    const categories = categoryMatches.map(m => m[1].trim().toLowerCase())

    if (!title || !url) continue

    items.push({
      title: title.trim(),
      url: url.trim(),
      description: description.trim().slice(0, 1000),
      imageUrl,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
      author,
      categories,
    })
  }

  return items
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i'))
  return m ? m[1] : ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

async function translateWithClaude(title: string, description: string): Promise<{ title_cs: string; description_cs: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { title_cs: title, description_cs: description }

  const prompt = `Jsi redaktor českého seriálového webu. Přelož titulek a perex článku do češtiny.

Pravidla:
- Piš přirozenou, moderní češtinu — jako novinář, ne překladač
- Vyhýbej se knižním výrazům (ne "posteskuje si", ale "lituje" nebo "je zklamaný")
- Jména herců, seriálů a postav ponechej v originále
- Titulek může být lehce upraven pro lepší čtivost, ale zachovej smysl
- Vrať pouze JSON s klíči "title" a "description", žádný jiný text

Titulek: ${title}
Perex: ${description}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const text = data?.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title_cs: parsed.title || title,
        description_cs: parsed.description || description,
      }
    }
  } catch (e) {
    console.error('Claude translation error:', e)
  }

  return { title_cs: title, description_cs: description }
}

export async function syncRssSources(): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const sources = await dbAll<{ id: number; name: string; url: string; excluded_categories: string }>(
    `SELECT id, name, url, excluded_categories FROM rss_sources WHERE active = 1`
  )

  const shows = await dbAll<{ id: number; title: string }>('SELECT id, title FROM shows')

  let imported = 0
  let skipped = 0
  const errors: string[] = []
  const db = getClient()

  for (const source of sources) {
    try {
      const res = await fetch(source.url, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TVShowsBot/1.0; +https://tvshows.cz)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const items = parseRss(xml)

      const excludedCats = (source.excluded_categories || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)

      for (const item of items) {
        const hasExcluded = item.categories.some((c: string) => excludedCats.some((ex: string) => c.includes(ex)))
        if (hasExcluded) { skipped++; continue }

        const matchedShows = shows.filter((s: { id: number; title: string }) => {
          const escaped = s.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          // Krátké názvy (≤4 znaky) musí sedět jako celé slovo, delší stačí jako podřetězec
          const pattern = s.title.length <= 4
            ? new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i')
            : new RegExp(escaped, 'i')
          return pattern.test(item.title) || pattern.test(item.description)
        })
        if (matchedShows.length === 0) { skipped++; continue }

        const { title_cs, description_cs } = await translateWithClaude(item.title, item.description)

        const result = await dbRun(
          `INSERT OR IGNORE INTO articles (title, title_cs, description, description_cs, url, source, author, image_url, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.title, title_cs, item.description, description_cs, item.url, source.name, item.author, item.imageUrl, item.publishedAt]
        )

        if (result.changes === 0) { skipped++; continue }

        const articleRow = await dbAll<{ id: number }>('SELECT id FROM articles WHERE url = ?', [item.url])
        const articleId = articleRow[0]?.id
        if (!articleId) continue

        const stmts = matchedShows.map((s: { id: number; title: string }) => ({
          sql: 'INSERT OR IGNORE INTO article_shows (article_id, show_id) VALUES (?, ?)',
          args: [articleId, s.id] as any[],
        }))
        if (stmts.length > 0) await db.batch(stmts, 'write')

        imported++
        await new Promise(r => setTimeout(r, 200))
      }

      await dbRun(`UPDATE rss_sources SET last_fetched_at = datetime('now') WHERE id = ?`, [source.id])

    } catch (e) {
      errors.push(`${source.name}: ${e}`)
    }
  }

  return { imported, skipped, errors }
}
