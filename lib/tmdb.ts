import { dbGet, dbRun, slugify } from './db'

const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'

function headers() {
  return {
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function tmdbGet(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`TMDb error ${res.status}: ${path}`)
  return res.json()
}

function posterUrl(p: string | null, size = 'w500') {
  return p ? `${IMG}/${size}${p}` : null
}

function detectCountry(originCountries: string[]): 'US' | 'UK' | null {
  if (originCountries.includes('US')) return 'US'
  if (originCountries.includes('GB')) return 'UK'
  return null
}

export async function searchShow(query: string) {
  const data = await tmdbGet(`/search/tv?query=${encodeURIComponent(query)}&language=en-US`)
  return data.results.map((r: any) => ({
    tmdb_id: r.id,
    title: r.name,
    first_air_date: r.first_air_date,
    poster_url: posterUrl(r.poster_path),
    overview: r.overview,
  }))
}

export async function importShow(tmdb_id: number): Promise<number> {
  const existing = await dbGet<{ id: number }>('SELECT id FROM shows WHERE tmdb_id = ?', [tmdb_id])
  if (existing) return existing.id

  const [show, credits, externalIds] = await Promise.all([
    tmdbGet(`/tv/${tmdb_id}?language=en-US&append_to_response=seasons`),
    tmdbGet(`/tv/${tmdb_id}/credits?language=en-US`),
    tmdbGet(`/tv/${tmdb_id}/external_ids`),
  ])

  const country = detectCountry(show.origin_country ?? [])
  const network = show.networks?.[0]?.name ?? null
  const slug = slugify(show.name)

  const { lastId: showId } = await dbRun(
    `INSERT INTO shows (title, slug, tmdb_id, imdb_id, description, rating_tmdb,
      poster_url, backdrop_url, status, first_air_date, last_air_date, network, country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      show.name, slug, tmdb_id, externalIds.imdb_id ?? null,
      show.overview, show.vote_average ?? null,
      posterUrl(show.poster_path), posterUrl(show.backdrop_path, 'original'),
      show.status, show.first_air_date ?? null, show.last_air_date ?? null,
      network, country,
    ]
  )

  // Import seasons + episodes
  for (const s of show.seasons ?? []) {
    if (s.season_number === 0) continue
    const seasonData = await tmdbGet(`/tv/${tmdb_id}/season/${s.season_number}?language=en-US`)

    const { lastId: seasonId } = await dbRun(
      `INSERT INTO seasons (show_id, season_number, name, episode_count, air_date, poster_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [showId, s.season_number, s.name, s.episode_count, s.air_date, posterUrl(s.poster_path)]
    )

    for (const ep of seasonData.episodes ?? []) {
      await dbRun(
        `INSERT INTO episodes (show_id, season_id, episode_number, title, description, air_date, runtime, still_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [showId, seasonId, ep.episode_number, ep.name, ep.overview,
          ep.air_date, ep.runtime, posterUrl(ep.still_path, 'w300')]
      )
    }
  }

  await importCredits(showId, credits)
  return showId
}

async function importCredits(showId: number, credits: any) {
  const cast: any[] = credits.cast ?? []
  const crew: any[] = credits.crew ?? []

  for (const c of cast.slice(0, 20)) {
    await dbRun(
      `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url) VALUES (?, ?, ?, ?)`,
      [c.name, slugify(c.name), c.id,
        c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null]
    )
    const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [c.id])
    if (person) {
      await dbRun(
        `INSERT OR IGNORE INTO show_people (show_id, person_id, role, character_name) VALUES (?, ?, ?, ?)`,
        [showId, person.id, 'actor', c.character]
      )
    }
  }

  const seenCrew = new Set<string>()
  for (const c of crew) {
    const key = `${c.id}-${c.job}`
    if (seenCrew.has(key)) continue
    seenCrew.add(key)

    let role: string | null = null
    if (c.job === 'Director') role = 'director'
    else if (c.job === 'Creator' || c.department === 'Creator') role = 'creator'
    else if (c.job === 'Writer') role = 'writer'
    if (!role) continue

    await dbRun(
      `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url) VALUES (?, ?, ?, ?)`,
      [c.name, slugify(c.name), c.id,
        c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null]
    )
    const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [c.id])
    if (person) {
      await dbRun(
        `INSERT OR IGNORE INTO show_people (show_id, person_id, role, character_name) VALUES (?, ?, ?, ?)`,
        [showId, person.id, role, null]
      )
    }
  }
}

export async function searchPerson(query: string) {
  const data = await tmdbGet(`/search/person?query=${encodeURIComponent(query)}&language=en-US`)
  return data.results.map((r: any) => ({
    tmdb_id: r.id,
    name: r.name,
    photo_url: r.profile_path ? `https://image.tmdb.org/t/p/w185${r.profile_path}` : null,
    known_for: r.known_for_department,
  }))
}

export async function importPerson(tmdb_id: number): Promise<number> {
  const existing = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [tmdb_id])
  if (existing) return existing.id

  const person = await tmdbGet(`/person/${tmdb_id}?language=en-US`)

  const { lastId } = await dbRun(
    `INSERT INTO people (name, slug, tmdb_id, bio, photo_url, birth_date, nationality)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      person.name, slugify(person.name), tmdb_id, person.biography,
      person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
      person.birthday ?? null, person.place_of_birth ?? null,
    ]
  )
  return lastId
}

export async function syncRatings(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return

  const [tmdbData, externalIds] = await Promise.all([
    tmdbGet(`/tv/${show.tmdb_id}?language=en-US`),
    tmdbGet(`/tv/${show.tmdb_id}/external_ids`),
  ])

  await dbRun(
    'UPDATE shows SET rating_tmdb = ?, imdb_id = ? WHERE id = ?',
    [tmdbData.vote_average ?? null, externalIds.imdb_id ?? null, show_id]
  )
}
