import { createClient, type Client, type InValue } from '@libsql/client'
import path from 'path'

let client: Client | null = null
let initialized = false

function getDbUrl(): string {
  const envUrl = process.env.TURSO_DATABASE_URL
  if (envUrl && envUrl.startsWith('libsql://')) return envUrl
  // Local dev: always use absolute path to avoid ambiguity
  return `file:${path.join(process.cwd(), 'tvshows.db')}`
}

export function getClient(): Client {
  if (!client) {
    client = createClient({
      url: getDbUrl(),
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
  // Migrate existing tables — ignore errors if column already exists
  const migrations = [
    `ALTER TABLE shows ADD COLUMN rating_rt INTEGER`,
    `ALTER TABLE shows ADD COLUMN rating_metacritic INTEGER`,
    `ALTER TABLE shows ADD COLUMN rating_imdb_votes TEXT`,
    `ALTER TABLE show_people ADD COLUMN episode_count INTEGER`,
    `ALTER TABLE episodes ADD COLUMN vote_average REAL`,
    `ALTER TABLE episodes ADD COLUMN vote_count INTEGER`,
    `CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      name_cs TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS show_genres (
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
      PRIMARY KEY (show_id, genre_id)
    )`,
    `ALTER TABLE shows ADD COLUMN trailer_key TEXT`,
    `ALTER TABLE shows ADD COLUMN popularity REAL`,
    `CREATE TABLE IF NOT EXISTS watch_providers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS show_watch_providers (
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES watch_providers(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'flatrate',
      PRIMARY KEY (show_id, provider_id)
    )`,
    `CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS show_keywords (
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
      PRIMARY KEY (show_id, keyword_id)
    )`,
    `CREATE TABLE IF NOT EXISTS rss_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      last_fetched_at TEXT,
      excluded_categories TEXT DEFAULT 'recap,recaps'
    )`,
    `ALTER TABLE shows ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE people ADD COLUMN death_date TEXT`,
    `ALTER TABLE shows ADD COLUMN logo_url TEXT`,
    `ALTER TABLE people ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE episodes ADD COLUMN description_cs TEXT`,
    `ALTER TABLE episodes ADD COLUMN manually_edited INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_user_episodes_user_id ON user_episodes(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_episodes_episode_id ON user_episodes(episode_id)`,
    `CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id)`,
    `CREATE INDEX IF NOT EXISTS idx_episode_people_episode_id ON episode_people(episode_id)`,
    `CREATE INDEX IF NOT EXISTS idx_episode_people_person_id ON episode_people(person_id)`,
    `CREATE INDEX IF NOT EXISTS idx_show_people_show_id ON show_people(show_id)`,
    `CREATE INDEX IF NOT EXISTS idx_show_people_person_id ON show_people(person_id)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON user_watchlist(user_id)`,
    `ALTER TABLE show_people ADD COLUMN cast_order INTEGER`,
    `ALTER TABLE people ADD COLUMN gender INTEGER`,
    `ALTER TABLE shows ADD COLUMN type TEXT`,
    `ALTER TABLE shows ADD COLUMN in_production INTEGER`,
    `ALTER TABLE shows ADD COLUMN number_of_episodes INTEGER`,
    `ALTER TABLE show_people ADD COLUMN character_name_locked INTEGER NOT NULL DEFAULT 0`,
  ]
  for (const sql of migrations) {
    try { await db.execute(sql) } catch { /* column already exists */ }
  }

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
    {
      sql: `CREATE TABLE IF NOT EXISTS episode_people (
        episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        person_id  INTEGER NOT NULL REFERENCES people(id)   ON DELETE CASCADE,
        role       TEXT NOT NULL DEFAULT 'guest',
        character_name TEXT,
        PRIMARY KEY (episode_id, person_id, role)
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        email      TEXT NOT NULL UNIQUE,
        name       TEXT,
        password_hash TEXT,
        google_id  TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_episodes (
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
        watched_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, episode_id)
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_show_ratings (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        rating  INTEGER NOT NULL CHECK (rating IN (-1, 0, 1)),
        rated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, show_id)
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_watchlist (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        added_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, show_id)
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
