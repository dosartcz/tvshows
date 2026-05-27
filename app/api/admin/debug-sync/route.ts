import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbAll, getClient } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getClient()
  const shows = await dbAll<{ id: number, tmdb_id: number, title: string }>(
    'SELECT id, tmdb_id, title FROM shows WHERE tmdb_id IS NOT NULL ORDER BY id'
  )

  const results = []

  for (const show of shows) {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${show.tmdb_id}/watch/providers`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}` },
      cache: 'no-store',
    })
    const data = await res.json()
    const czData = data?.results?.['CZ'] ?? null

    const providers: { name: string, id: number, logo: string | null }[] = []
    const types = ['flatrate', 'free', 'ads'] as const
    for (const type of types) {
      for (const p of czData?.[type] ?? []) {
        providers.push({
          name: p.provider_name,
          id: p.provider_id,
          logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
        })
      }
    }

    // Batch: DELETE + INSERT vše v jedné transakci
    const statements: any[] = [
      { sql: 'DELETE FROM show_watch_providers WHERE show_id = ?', args: [show.id] },
    ]
    for (const p of providers) {
      statements.push({ sql: 'INSERT OR IGNORE INTO watch_providers (id, name, logo_url) VALUES (?, ?, ?)', args: [p.id, p.name, p.logo] })
      statements.push({ sql: 'INSERT INTO show_watch_providers (show_id, provider_id, type) VALUES (?, ?, ?)', args: [show.id, p.id, 'flatrate'] })
    }

    if (statements.length > 1) {
      await db.batch(statements, 'write')
    }

    results.push({ title: show.title, providers: providers.map(p => p.name) })
    await new Promise(r => setTimeout(r, 300))
  }

  const inDb = await dbAll(`
    SELECT s.title, wp.name
    FROM show_watch_providers swp
    JOIN watch_providers wp ON swp.provider_id = wp.id
    JOIN shows s ON swp.show_id = s.id
    ORDER BY s.title
  `)

  return NextResponse.json({ ok: true, results, inDb })
}
