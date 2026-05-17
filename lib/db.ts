import { createClient, type Client, type InValue } from '@libsql/client'

let client: Client | null = null
let initialized = false

export function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? 'file:./tvshows.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return client
}

export async function getDb(): Promise<Client> {
  const db = getClient()
  if (!initialized) {
    await initSchema(db)
    initialized = true
  }
  return db
}

async function initSchema(db: Client) {
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS franchises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        logo_url TEXT
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS shows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        tmdb_id INTEGER UNIQUE,
        imdb_id TEXT,
        description TEXT,
        description_cs TEXT,
        rating_imdb REAL,
        rating_tmdb REAL,
        poster_url TEXT,
        backdrop_url TEXT,
        status TEXT,
        first_air_date TEXT,
        last_air_date TEXT,
        network TEXT,
        country TEXT,
        franchise_id INTEGER REFERENCES franchises(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        tmdb_id INTEGER UNIQUE,
        bio TEXT,
        bio_cs TEXT,
        photo_url TEXT,
        birth_date TEXT,
        nationality TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS show_people (
        show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        character_name TEXT,
        PRIMARY KEY (show_id, person_id, role)
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        season_number INTEGER NOT NULL,
        name TEXT,
        episode_count INTEGER,
        air_date TEXT,
        poster_url TEXT
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
        episode_number INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        air_date TEXT,
        runtime INTEGER,
        still_url TEXT
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        title_cs TEXT,
        description TEXT,
        description_cs TEXT,
        url TEXT NOT NULL UNIQUE,
        source TEXT,
        author TEXT,
        image_url TEXT,
        published_at TEXT,
        imported_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS article_shows (
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        PRIMARY KEY (article_id, show_id)
      )`,
    },
  ], 'write')
}

export async function dbGet<T = any>(
  sql: string,
  args: InValue[] = []
): Promise<T | null> {
  const db = await getDb()
  const result = await db.execute({ sql, args })
  return (result.rows[0] as unknown as T) ?? null
}

export async function dbAll<T = any>(
  sql: string,
  args: InValue[] = []
): Promise<T[]> {
  const db = await getDb()
  const result = await db.execute({ sql, args })
  return result.rows as unknown as T[]
}

export async function dbRun(
  sql: string,
  args: InValue[] = []
): Promise<{ lastId: number; changes: number }> {
  const db = await getDb()
  const result = await db.execute({ sql, args })
  return {
    lastId: Number(result.lastInsertRowid),
    changes: result.rowsAffected,
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
