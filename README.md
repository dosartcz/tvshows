# TVShows.cz

Databáze US a UK televizních seriálů s osobním sledováním epizod, statistikami a komunitními funkcemi.

---

## Stack

- **Next.js 14** (App Router, server + client komponenty)
- **NextAuth v4** — přihlášení přes Google + e-mail/heslo
- **Turso / libSQL** — SQLite databáze s read replikou
- **Tailwind CSS**
- **TMDB API** — data o seriálech, hercích, epizodách
- **Vercel** — hosting + cron joby

---

## Funkce

### Frontend
- Přehled seriálů s filtrováním (žánr, síť, status, franchise)
- Detail seriálu — popis, obsazení, tvůrci & štáb, epizody, aktuality, podobné seriály
- Sledování epizod — označování zhlédnutých epizod a celých sezón
- Watchlist — seznam seriálů k dokoukání
- Uživatelské hodnocení hvězdičkami
- Profil uživatele — statistiky, zhlédnuté a rozkoukaných seriálů
- Sidebar statistiky — nejsledovanější režisér, scenárista, herec, herečka, hlas
- Stránky herců a tvůrců s přehledem seriálů

### Admin
- Správa seriálů, herců a aktualit (přidání, editace, mazání, hromadné mazání)
- Sync dat z TMDB — seriály, herci, epizody, obsazení, žánry, klíčová slova, loga, trailery, watch providers, hodnocení
- RSS zdroje — automatické stahování aktualit a přiřazování k seriálům
- Překlad popisů (CS) přes AI
- Franchise — seskupování seriálů do franšíz

---

## Databázové tabulky

| Tabulka | Popis |
|---|---|
| `shows` | Seriály |
| `seasons` | Sezóny |
| `episodes` | Epizody |
| `people` | Herci, režiséři, scenáristé |
| `show_people` | Vazba osoba ↔ seriál (role, postava, počet epizod) |
| `episode_people` | Vazba osoba ↔ epizoda |
| `genres` / `show_genres` | Žánry |
| `franchises` | Franšízy |
| `watch_providers` / `show_watch_providers` | Streamovací služby |
| `keywords` / `show_keywords` | Klíčová slova |
| `articles` / `article_shows` | Aktuality přiřazené k seriálům |
| `rss_sources` | Zdroje RSS feedů |
| `users` | Uživatelé |
| `user_episodes` | Zhlédnuté epizody |
| `user_show_ratings` | Hodnocení seriálů |
| `user_watchlist` | Watchlist |

---

## Lokální spuštění

```bash
npm install
```

Vytvoř `.env.local`:

```env
TURSO_URL=libsql://...
TURSO_AUTH_TOKEN=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
TMDB_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAIL=...
```

```bash
npm run dev
```

---

## Cron joby

| Endpoint | Schedule | Popis |
|---|---|---|
| `/api/cron/sync-episodes` | každý den ve 3:00 | Aktualizace nových epizod |

---

## Autor

[Adam Vandrovec](https://github.com/dosartcz)
