import { dbGet, dbRun, dbAll, getClient, slugify } from './db'
import { syncOmdbRatings } from './omdb'

const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'

function headers() {
  return {
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function tmdbGet(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error(`TMDb error ${res.status}: ${path}`)
  return res.json()
}

function posterUrl(p: string | null, size = 'w500') {
  return p ? `${IMG}/${size}${p}` : null
}

function pickTrailer(videos: any[]): string | null {
  const order = ['Trailer', 'Teaser', 'Clip', 'Featurette']
  for (const type of order) {
    const v = videos.find((v: any) => v.site === 'YouTube' && v.type === type && v.official)
    if (v) return v.key
  }
  const any = videos.find((v: any) => v.site === 'YouTube')
  return any?.key ?? null
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

  const [show, credits, externalIds, videos, keywordsData, watchProvidersData, translationsData] = await Promise.all([
    tmdbGet(`/tv/${tmdb_id}?language=en-US&append_to_response=seasons`),
    tmdbGet(`/tv/${tmdb_id}/aggregate_credits?language=en-US`),
    tmdbGet(`/tv/${tmdb_id}/external_ids`),
    tmdbGet(`/tv/${tmdb_id}/videos?language=en-US`),
    tmdbGet(`/tv/${tmdb_id}/keywords`),
    tmdbGet(`/tv/${tmdb_id}/watch/providers`),
    tmdbGet(`/tv/${tmdb_id}/translations`),
  ])

  const descriptionCs = (translationsData?.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')?.data?.overview || null

  const country = detectCountry(show.origin_country ?? [])
  const network = show.networks?.[0]?.name ?? null
  const slug = slugify(show.name)
  const trailerKey = pickTrailer(videos?.results ?? [])

  const { lastId: showId } = await dbRun(
    `INSERT INTO shows (title, slug, tmdb_id, imdb_id, description, description_cs, rating_tmdb,
      poster_url, backdrop_url, status, first_air_date, last_air_date, network, country, trailer_key, popularity,
      type, in_production, number_of_episodes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      show.name, slug, tmdb_id, externalIds.imdb_id ?? null,
      show.overview, descriptionCs, show.vote_average ?? null,
      posterUrl(show.poster_path), posterUrl(show.backdrop_path, 'original'),
      show.status, show.first_air_date ?? null, show.last_air_date ?? null,
      network, country, trailerKey, show.popularity ?? null,
      show.type ?? null, show.in_production ? 1 : 0, show.number_of_episodes ?? null,
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
      const epTranslationCs = await tmdbGet(`/tv/${tmdb_id}/season/${s.season_number}/episode/${ep.episode_number}/translations`)
        .then((d: any) => (d.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')?.data?.overview || null)
        .catch(() => null)
      const { lastId: epId } = await dbRun(
        `INSERT INTO episodes (show_id, season_id, episode_number, title, description, description_cs, air_date, runtime, still_url, vote_average, vote_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [showId, seasonId, ep.episode_number, ep.name, ep.overview, epTranslationCs,
          ep.air_date, ep.runtime, posterUrl(ep.still_path, 'original'),
          ep.vote_average ?? null, ep.vote_count ?? null]
      )
      await importEpisodeCredits(epId, tmdb_id, s.season_number, ep.episode_number).catch(() => null)
    }
  }

  await importCredits(showId, credits)
  await importCreatedBy(showId, show.created_by ?? [])
  await importGenres(showId, show.genres ?? [])
  await importKeywords(showId, keywordsData?.results ?? [])
  await importWatchProviders(showId, watchProvidersData?.results ?? {})

  // Auto-fetch OMDb ratings (RT + Metacritic)
  if (externalIds.imdb_id) {
    await syncOmdbRatings(showId, externalIds.imdb_id).catch(() => null)
  }

  return showId
}

async function importCreatedBy(showId: number, creators: any[]) {
  for (const c of creators) {
    await dbRun(
      `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url) VALUES (?, ?, ?, ?)`,
      [c.name, slugify(c.name), c.id,
        c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null]
    )
    const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [c.id])
    if (person) {
      await dbRun(
        `INSERT OR IGNORE INTO show_people (show_id, person_id, role, character_name) VALUES (?, ?, 'creator', NULL)`,
        [showId, person.id]
      )
    }
  }
}

async function importCredits(showId: number, credits: any) {
  // aggregate_credits: cast[].roles[].character, crew[].jobs[].job
  const cast: any[] = credits.cast ?? []
  const crew: any[] = credits.crew ?? []

  for (const c of cast) {
    const character = c.roles?.[0]?.character ?? c.character ?? null
    const episodeCount = c.total_episode_count ?? c.roles?.reduce((s: number, r: any) => s + (r.episode_count ?? 0), 0) ?? null
    await dbRun(
      `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url, gender) VALUES (?, ?, ?, ?, ?)`,
      [c.name, slugify(c.name), c.id,
        c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        c.gender ?? null]
    )
    if (c.gender) await dbRun('UPDATE people SET gender = ? WHERE tmdb_id = ? AND (gender IS NULL OR gender = 0)', [c.gender, c.id])
    const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [c.id])
    if (person) {
      await dbRun(
        `INSERT INTO show_people (show_id, person_id, role, character_name, episode_count, cast_order)
         VALUES (?, ?, 'actor', ?, ?, ?)
         ON CONFLICT(show_id, person_id, role) DO UPDATE SET
           character_name = CASE WHEN character_name_locked = 1 THEN character_name ELSE excluded.character_name END,
           episode_count = excluded.episode_count,
           cast_order = excluded.cast_order`,
        [showId, person.id, character, episodeCount, c.order ?? null]
      )
    }
  }

  const seenCrew = new Set<string>()
  for (const c of crew) {
    const jobs: any[] = c.jobs ?? (c.job ? [{ job: c.job, episode_count: null }] : [])
    for (const jobObj of jobs) {
      const job = jobObj.job ?? jobObj
      const key = `${c.id}-${job}`
      if (seenCrew.has(key)) continue
      seenCrew.add(key)

      let role: string | null = null
      if (job === 'Director') role = 'director'
      else if (job === 'Creator' || c.department === 'Creator') role = 'creator'
      else if (job === 'Writer') role = 'writer'
      if (!role) continue

      const crewEpisodeCount = jobObj.episode_count ?? null

      await dbRun(
        `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url) VALUES (?, ?, ?, ?)`,
        [c.name, slugify(c.name), c.id,
          c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null]
      )
      const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [c.id])
      if (person) {
        await dbRun(
          `INSERT OR REPLACE INTO show_people (show_id, person_id, role, character_name, episode_count) VALUES (?, ?, ?, ?, ?)`,
          [showId, person.id, role, null, crewEpisodeCount]
        )
      }
    }
  }
}

export async function importEpisodeCredits(episodeId: number, tmdbShowId: number, seasonNum: number, episodeNum: number) {
  const credits = await tmdbGet(`/tv/${tmdbShowId}/season/${seasonNum}/episode/${episodeNum}/credits?language=en-US`)

  const cast: any[] = credits.cast ?? []
  for (const c of cast) {
    await dbRun(
      `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url, gender) VALUES (?, ?, ?, ?, ?)`,
      [c.name, slugify(c.name), c.id,
        c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        c.gender ?? null]
    )
    if (c.gender) await dbRun('UPDATE people SET gender = ? WHERE tmdb_id = ? AND (gender IS NULL OR gender = 0)', [c.gender, c.id])
    const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [c.id])
    if (person) {
      await dbRun(
        `INSERT OR IGNORE INTO episode_people (episode_id, person_id, role, character_name) VALUES (?, ?, ?, ?)`,
        [episodeId, person.id, 'cast', c.character ?? null]
      )
    }
  }

  const crew: any[] = credits.crew ?? []
  for (const c of crew) {
    const job = c.job ?? ''
    let role: string | null = null
    if (job === 'Director') role = 'director'
    else if (job === 'Writer' || job === 'Teleplay' || job === 'Story') role = 'writer'
    if (!role) continue
    await dbRun(
      `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url) VALUES (?, ?, ?, ?)`,
      [c.name, slugify(c.name), c.id,
        c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null]
    )
    const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [c.id])
    if (person) {
      await dbRun(
        `INSERT OR IGNORE INTO episode_people (episode_id, person_id, role, character_name) VALUES (?, ?, ?, ?)`,
        [episodeId, person.id, role, job]
      )
    }
  }

  const guestStars: any[] = credits.guest_stars ?? []
  for (const g of guestStars) {
    await dbRun(
      `INSERT OR IGNORE INTO people (name, slug, tmdb_id, photo_url) VALUES (?, ?, ?, ?)`,
      [g.name, slugify(g.name), g.id,
        g.profile_path ? `https://image.tmdb.org/t/p/w185${g.profile_path}` : null]
    )
    const person = await dbGet<{ id: number }>('SELECT id FROM people WHERE tmdb_id = ?', [g.id])
    if (person) {
      await dbRun(
        `INSERT OR IGNORE INTO episode_people (episode_id, person_id, role, character_name) VALUES (?, ?, ?, ?)`,
        [episodeId, person.id, 'guest_star', g.character ?? null]
      )
    }
  }
}

export async function syncSpecials(show_id: number): Promise<{ imported: number }> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return { imported: 0 }

  const seasonData = await tmdbGet(`/tv/${show.tmdb_id}/season/0?language=en-US`)
  const episodes: any[] = seasonData.episodes ?? []
  if (episodes.length === 0) return { imported: 0 }

  let season = await dbGet<{ id: number }>('SELECT id FROM seasons WHERE show_id = ? AND season_number = 0', [show_id])
  if (!season) {
    const tmdbShow = await tmdbGet(`/tv/${show.tmdb_id}?language=en-US`)
    const s0 = tmdbShow.seasons?.find((s: any) => s.season_number === 0)
    const { lastId: seasonId } = await dbRun(
      `INSERT INTO seasons (show_id, season_number, name, episode_count, air_date, poster_url) VALUES (?, 0, ?, ?, ?, ?)`,
      [show_id, s0?.name ?? 'Speciály', s0?.episode_count ?? episodes.length, s0?.air_date ?? null, posterUrl(s0?.poster_path)]
    )
    season = { id: seasonId }
  }

  let imported = 0
  for (const ep of episodes) {
    const existing = await dbGet<{ id: number }>(
      'SELECT id FROM episodes WHERE season_id = ? AND episode_number = ?',
      [season.id, ep.episode_number]
    )
    if (!existing) {
      const { lastId: epId } = await dbRun(
        `INSERT INTO episodes (show_id, season_id, episode_number, title, description, air_date, runtime, still_url, vote_average, vote_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [show_id, season.id, ep.episode_number, ep.name, ep.overview,
          ep.air_date, ep.runtime, posterUrl(ep.still_path, 'original'),
          ep.vote_average ?? null, ep.vote_count ?? null]
      )
      await importEpisodeCredits(epId, show.tmdb_id, 0, ep.episode_number).catch(() => null)
      imported++
    } else {
      // Doplnit chybějící credits
      const hasCast = await dbGet<{ c: number }>(
        `SELECT COUNT(*) as c FROM episode_people WHERE episode_id = ?`,
        [existing.id]
      )
      if (!hasCast?.c) {
        await importEpisodeCredits(existing.id, show.tmdb_id, 0, ep.episode_number).catch(() => null)
      }
    }
  }

  return { imported }
}

export async function syncEpisodes(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return

  const tmdbShow = await tmdbGet(`/tv/${show.tmdb_id}?language=en-US`)
  const seasons: any[] = tmdbShow.seasons ?? []

  for (const s of seasons) {
    if (s.season_number === 0) continue
    const seasonData = await tmdbGet(`/tv/${show.tmdb_id}/season/${s.season_number}?language=en-US`)

    let season = await dbGet<{ id: number }>(
      'SELECT id FROM seasons WHERE show_id = ? AND season_number = ?',
      [show_id, s.season_number]
    )

    if (!season) {
      const { lastId: seasonId } = await dbRun(
        `INSERT INTO seasons (show_id, season_number, name, episode_count, air_date, poster_url) VALUES (?, ?, ?, ?, ?, ?)`,
        [show_id, s.season_number, s.name, s.episode_count, s.air_date, posterUrl(s.poster_path)]
      )
      season = { id: seasonId }

      for (const ep of seasonData.episodes ?? []) {
        const epCs = await tmdbGet(`/tv/${show.tmdb_id}/season/${s.season_number}/episode/${ep.episode_number}/translations`)
          .then((d: any) => (d.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')?.data?.overview || null)
          .catch(() => null)
        const { lastId: epId } = await dbRun(
          `INSERT INTO episodes (show_id, season_id, episode_number, title, description, description_cs, air_date, runtime, still_url, vote_average, vote_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [show_id, season.id, ep.episode_number, ep.name, ep.overview, epCs,
            ep.air_date, ep.runtime, posterUrl(ep.still_path, 'original'),
            ep.vote_average ?? null, ep.vote_count ?? null]
        )
        await importEpisodeCredits(epId, show.tmdb_id, s.season_number, ep.episode_number).catch(() => null)
      }
    } else {
      for (const ep of seasonData.episodes ?? []) {
        const existing = await dbGet<{ id: number }>(
          'SELECT id FROM episodes WHERE season_id = ? AND episode_number = ?',
          [season.id, ep.episode_number]
        )
        if (!existing) {
          const epCs = await tmdbGet(`/tv/${show.tmdb_id}/season/${s.season_number}/episode/${ep.episode_number}/translations`)
            .then((d: any) => (d.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')?.data?.overview || null)
            .catch(() => null)
          const { lastId: epId } = await dbRun(
            `INSERT INTO episodes (show_id, season_id, episode_number, title, description, description_cs, air_date, runtime, still_url, vote_average, vote_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [show_id, season.id, ep.episode_number, ep.name, ep.overview, epCs,
              ep.air_date, ep.runtime, posterUrl(ep.still_path, 'original'),
              ep.vote_average ?? null, ep.vote_count ?? null]
          )
          await importEpisodeCredits(epId, show.tmdb_id, s.season_number, ep.episode_number).catch(() => null)
        } else {
          await dbRun(
            `UPDATE episodes SET title=?, description=?, air_date=?, runtime=?, still_url=?, vote_average=?, vote_count=?
             WHERE id=?`,
            [ep.name, ep.overview, ep.air_date, ep.runtime, posterUrl(ep.still_path, 'original'),
              ep.vote_average ?? null, ep.vote_count ?? null, existing.id]
          )
          // Doplnit chybějící crew (director/writer)
          const hasCrew = await dbGet<{ c: number }>(
            `SELECT COUNT(*) as c FROM episode_people WHERE episode_id = ? AND role IN ('director', 'writer')`,
            [existing.id]
          )
          if (!hasCrew?.c) {
            await importEpisodeCredits(existing.id, show.tmdb_id, s.season_number, ep.episode_number).catch(() => null)
          }
        }
      }
    }
  }

  await dbRun(
    'UPDATE shows SET last_air_date = ?, status = ?, in_production = ?, number_of_episodes = ? WHERE id = ?',
    [tmdbShow.last_air_date ?? null, tmdbShow.status ?? null,
     tmdbShow.in_production ? 1 : 0, tmdbShow.number_of_episodes ?? null, show_id]
  )
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

  const [person, personTranslations] = await Promise.all([
    tmdbGet(`/person/${tmdb_id}?language=en-US`),
    tmdbGet(`/person/${tmdb_id}/translations`).catch(() => null),
  ])

  const bioCs = (personTranslations?.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')?.data?.biography || null

  const { lastId } = await dbRun(
    `INSERT INTO people (name, slug, tmdb_id, bio, bio_cs, photo_url, birth_date, nationality)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      person.name, slugify(person.name), tmdb_id, person.biography, bioCs,
      person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
      person.birthday ?? null, person.place_of_birth ?? null,
    ]
  )
  return lastId
}

// TMDB genre ID → český překlad
const GENRE_CS: Record<number, string> = {
  10759: 'Akce a dobrodružství', 16: 'Animace', 35: 'Komedie', 80: 'Krimi',
  99: 'Dokument', 18: 'Drama', 10751: 'Rodinný', 10762: 'Pro děti',
  9648: 'Mysteriózní', 10763: 'Zprávy', 10764: 'Reality', 10765: 'Sci-Fi a Fantasy',
  10766: 'Soap opera', 10767: 'Talk show', 10768: 'Válka a politika', 37: 'Western',
}

async function importGenres(showId: number, genres: { id: number; name: string }[]) {
  for (const g of genres) {
    await dbRun(
      `INSERT OR IGNORE INTO genres (id, name, name_cs) VALUES (?, ?, ?)`,
      [g.id, g.name, GENRE_CS[g.id] ?? null]
    )
    await dbRun(
      `INSERT OR IGNORE INTO show_genres (show_id, genre_id) VALUES (?, ?)`,
      [showId, g.id]
    )
  }
}

async function importWatchProviders(showId: number, results: Record<string, any>) {
  // Prioritně CZ, fallback na SK, pak vynecháme
  const czData = results['CZ'] ?? results['SK'] ?? null
  if (!czData) return

  const db = getClient()
  const statements: { sql: string; args?: any[] }[] = [
    { sql: 'DELETE FROM show_watch_providers WHERE show_id = ?', args: [showId] },
  ]

  const types = ['flatrate', 'free', 'ads'] as const
  for (const type of types) {
    for (const p of czData[type] ?? []) {
      const logoUrl = p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null
      statements.push({
        sql: 'INSERT OR IGNORE INTO watch_providers (id, name, logo_url) VALUES (?, ?, ?)',
        args: [p.provider_id, p.provider_name, logoUrl],
      })
      statements.push({
        sql: 'INSERT INTO show_watch_providers (show_id, provider_id, type) VALUES (?, ?, ?)',
        args: [showId, p.provider_id, type],
      })
    }
  }

  if (statements.length > 1) {
    await db.batch(statements, 'write')
  }
}

export async function syncWatchProviders(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return
  const data = await tmdbGet(`/tv/${show.tmdb_id}/watch/providers`)
  await importWatchProviders(show_id, data?.results ?? {})
}

async function importKeywords(showId: number, keywords: { id: number; name: string }[]) {
  for (const k of keywords) {
    await dbRun(`INSERT OR IGNORE INTO keywords (id, name) VALUES (?, ?)`, [k.id, k.name])
    await dbRun(`INSERT OR IGNORE INTO show_keywords (show_id, keyword_id) VALUES (?, ?)`, [showId, k.id])
  }
}

export async function syncKeywords(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return
  const data = await tmdbGet(`/tv/${show.tmdb_id}/keywords`)
  await importKeywords(show_id, data?.results ?? [])
}

export async function syncPopularity(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return
  const data = await tmdbGet(`/tv/${show.tmdb_id}?language=en-US`)
  await dbRun('UPDATE shows SET popularity = ? WHERE id = ?', [data.popularity ?? null, show_id])
}

export async function getSimilarShows(tmdb_id: number): Promise<any[]> {
  const data = await tmdbGet(`/tv/${tmdb_id}/recommendations?language=en-US&page=1`)
  return data?.results?.slice(0, 12) ?? []
}

export async function syncTrailer(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return
  const videos = await tmdbGet(`/tv/${show.tmdb_id}/videos?language=en-US`)
  const key = pickTrailer(videos?.results ?? [])
  await dbRun('UPDATE shows SET trailer_key = ? WHERE id = ?', [key, show_id])
}

export async function syncGenres(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return
  const data = await tmdbGet(`/tv/${show.tmdb_id}?language=en-US`)
  await importGenres(show_id, data.genres ?? [])
}

export async function syncCast(show_id: number): Promise<void> {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [show_id])
  if (!show?.tmdb_id) return
  const credits = await tmdbGet(`/tv/${show.tmdb_id}/aggregate_credits?language=en-US`)
  await importCredits(show_id, credits)
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

export async function syncLogos(showId: number) {
  const show = await dbGet<{ tmdb_id: number }>('SELECT tmdb_id FROM shows WHERE id = ?', [showId])
  if (!show?.tmdb_id) return null

  const data = await tmdbGet(`/tv/${show.tmdb_id}/images?include_image_language=en,null`)
  const logos = data.logos ?? []

  // Preferuj anglické SVG/PNG logo, pak cokoliv
  const logo = logos.find((l: any) => l.iso_639_1 === 'en') ?? logos[0] ?? null
  if (!logo) return null

  const logoUrl = `https://image.tmdb.org/t/p/w500${logo.file_path}`
  await dbRun('UPDATE shows SET logo_url = ? WHERE id = ?', [logoUrl, showId])
  return logoUrl
}

export async function getShowTranslationCS(tmdbId: number): Promise<string | null> {
  const data = await tmdbGet(`/tv/${tmdbId}/translations`)
  const cs = (data.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')
  return cs?.data?.overview || null
}

export async function getEpisodeTranslationCS(tmdbShowId: number, seasonNum: number, episodeNum: number): Promise<string | null> {
  const data = await tmdbGet(`/tv/${tmdbShowId}/season/${seasonNum}/episode/${episodeNum}/translations`)
  const cs = (data.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')
  return cs?.data?.overview || null
}

export async function getPersonTranslationCS(tmdbId: number): Promise<string | null> {
  const data = await tmdbGet(`/person/${tmdbId}/translations`)
  const cs = (data.translations ?? []).find((t: any) => t.iso_639_1 === 'cs')
  return cs?.data?.biography || null
}

export async function getEpisodeStills(showTmdbId: number, seasonNum: number, episodeNum: number): Promise<string[]> {
  const data = await tmdbGet(`/tv/${showTmdbId}/season/${seasonNum}/episode/${episodeNum}/images`)
  const stills: any[] = data.stills ?? []
  return stills
    .sort((a: any, b: any) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 16)
    .map((s: any) => `https://image.tmdb.org/t/p/w780${s.file_path}`)
}

export interface EpisodeVideo {
  key: string
  name: string
  type: string
  site: string
}

export async function getEpisodeVideos(showTmdbId: number, seasonNum: number, episodeNum: number): Promise<EpisodeVideo[]> {
  const data = await tmdbGet(`/tv/${showTmdbId}/season/${seasonNum}/episode/${episodeNum}/videos`)
  const results: any[] = data.results ?? []
  return results
    .filter((v: any) => v.site === 'YouTube')
    .slice(0, 8)
    .map((v: any) => ({ key: v.key, name: v.name, type: v.type, site: v.site }))
}

export async function syncAllLogos() {
  const shows = await dbAll<{ id: number }>('SELECT id FROM shows WHERE logo_url IS NULL AND tmdb_id IS NOT NULL')
  let synced = 0
  for (const show of shows) {
    try {
      const result = await syncLogos(show.id)
      if (result) synced++
    } catch { /* skip */ }
  }
  return synced
}
