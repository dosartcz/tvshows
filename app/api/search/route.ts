import { NextRequest, NextResponse } from 'next/server'
import { dbAll } from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ shows: [], people: [] })

  const like = `%${q}%`

  const shows = await dbAll(
    `SELECT id, title, slug, poster_url, rating_imdb, first_air_date
     FROM shows WHERE title LIKE ? ORDER BY rating_imdb DESC LIMIT 6`,
    [like]
  )

  const people = await dbAll(
    `SELECT id, name, slug, photo_url FROM people WHERE name LIKE ? LIMIT 4`,
    [like]
  )

  return NextResponse.json({ shows, people })
}
