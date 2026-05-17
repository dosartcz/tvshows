import { dbAll, dbRun } from './db'

const FEEDS = [
  { url: 'https://variety.com/feed/', source: 'Variety' },
  { url: 'https://deadline.com/feed/', source: 'Deadline' },
  { url: 'https://www.hollywoodreporter.com/feed/', source: 'Hollywood Reporter' },
  { url: 'https://www.denofgeek.com/feed/', source: 'Den of Geek' },
]

interface FeedItem {
  title: string
  link: string
  description?: string
  author?: string
  pubDate?: string
  enclosure?: string
}

async function parseFeed(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return []
  const xml = await res.text()

  const items: FeedItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let matchResult: RegExpExecArray | null

  while ((matchResult = itemRegex.exec(xml)) !== null) {
    const block = matchResult[1]
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))
      return m ? m[1].trim() : undefined
    }
    const getAttr = (tag: string, attr: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
      return m ? m[1] : undefined
    }

    const link = get('link') ?? get('guid') ?? ''
    if (!link) continue

    items.push({
      title: get('title') ?? '',
      link,
      description: get('description'),
      author: get('author') ?? get('dc:creator'),
      pubDate: get('pubDate'),
      enclosure: getAttr('enclosure', 'url'),
    })
  }

  return items
}

export async function fetchAllFeeds(): Promise<{ count: number }> {
  const allShows = await dbAll<{ id: number; title: string }>('SELECT id, title FROM shows')
  let newCount = 0

  for (const feed of FEEDS) {
    let items: FeedItem[]
    try {
      items = await parseFeed(feed.url)
    } catch {
      continue
    }

    for (const item of items) {
      const { changes, lastId } = await dbRun(
        `INSERT OR IGNORE INTO articles (title, url, description, source, author, image_url, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.title, item.link,
          item.description ? stripHtml(item.description).slice(0, 500) : null,
          feed.source, item.author ?? null, item.enclosure ?? null,
          item.pubDate ? new Date(item.pubDate).toISOString() : null,
        ]
      )

      if (changes > 0) {
        newCount++
        const titleLower = item.title.toLowerCase()
        for (const show of allShows) {
          if (titleLower.includes(show.title.toLowerCase())) {
            await dbRun(
              'INSERT OR IGNORE INTO article_shows (article_id, show_id) VALUES (?, ?)',
              [lastId, show.id]
            )
          }
        }
      }
    }
  }

  return { count: newCount }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim()
}
