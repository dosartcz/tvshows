import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbGet, dbRun } from '@/lib/db'

const BASE = 'https://api.themoviedb.org/3'

function headers() {
  return {
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const person = await dbGet<{ id: number; tmdb_id: number }>(
    'SELECT id, tmdb_id FROM people WHERE id = ?',
    [Number(params.id)]
  )

  if (!person?.tmdb_id) {
    return NextResponse.json({ error: 'Herec nemá TMDb ID' }, { status: 400 })
  }

  const res = await fetch(`${BASE}/person/${person.tmdb_id}?language=en-US`, { headers: headers() })
  if (!res.ok) return NextResponse.json({ error: `TMDb error ${res.status}` }, { status: 500 })

  const data = await res.json()

  await dbRun(
    `UPDATE people SET
      bio = ?,
      photo_url = COALESCE(NULLIF(photo_url, ''), ?),
      birth_date = ?,
      death_date = ?,
      nationality = ?
     WHERE id = ?`,
    [
      data.biography || null,
      data.profile_path ? `https://image.tmdb.org/t/p/w185${data.profile_path}` : null,
      data.birthday || null,
      data.deathday || null,
      data.place_of_birth || null,
      person.id,
    ]
  )

  return NextResponse.json({
    ok: true,
    bio: data.biography || null,
    photo_url: data.profile_path ? `https://image.tmdb.org/t/p/w185${data.profile_path}` : null,
    birth_date: data.birthday || null,
    death_date: data.deathday || null,
    nationality: data.place_of_birth || null,
  })
}
