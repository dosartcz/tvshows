import { dbRun } from './db'

const BASE = 'https://www.omdbapi.com'

function getKey() {
  return process.env.OMDB_API_KEY ?? ''
}

interface OmdbRatings {
  imdb: number | null
  imdb_votes: string | null
  rt: number | null       // Rotten Tomatoes %
  metacritic: number | null
}

export async function fetchOmdbRatings(imdb_id: string): Promise<OmdbRatings | null> {
  const key = getKey()
  if (!key) return null

  const res = await fetch(`${BASE}/?i=${imdb_id}&apikey=${key}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.Response === 'False') return null

  const imdb = data.imdbRating && data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null
  const imdb_votes = data.imdbVotes && data.imdbVotes !== 'N/A' ? data.imdbVotes : null

  let rt: number | null = null
  let metacritic: number | null = null

  for (const r of data.Ratings ?? []) {
    if (r.Source === 'Rotten Tomatoes') {
      rt = parseInt(r.Value) || null
    }
    if (r.Source === 'Metacritic') {
      metacritic = parseInt(r.Value) || null
    }
  }

  return { imdb, imdb_votes, rt, metacritic }
}

export async function syncOmdbRatings(show_id: number, imdb_id: string): Promise<OmdbRatings | null> {
  const ratings = await fetchOmdbRatings(imdb_id)
  if (!ratings) return null

  await dbRun(
    `UPDATE shows SET
      rating_imdb = COALESCE(?, rating_imdb),
      rating_imdb_votes = ?,
      rating_rt = ?,
      rating_metacritic = ?
     WHERE id = ?`,
    [ratings.imdb, ratings.imdb_votes, ratings.rt, ratings.metacritic, show_id]
  )

  return ratings
}
