# Claude Code prompt — TV shows web app

## Kontext projektu

Next.js 14 (App Router), TypeScript, Tailwind CSS, `@libsql/client` (Turso / lokální SQLite soubor `tvshows.db`), `next-auth` v4.

Produkce běží na Vercel + Turso. Lokální dev používá soubor `tvshows.db`.

---

## Co potřebuji implementovat

Dva vzájemně propojené okruhy. Implementuj je najednou, v tomto pořadí: nejdřív DB schéma a API vrstva, pak frontend.

---

## OKRUH 1 — Vylepšení epizod

### 1a. Nová pole v tabulce `episodes`

Přidej migrace do `initSchema` v `lib/db.ts`:

```sql
ALTER TABLE episodes ADD COLUMN vote_average REAL;
ALTER TABLE episodes ADD COLUMN vote_count INTEGER;
```

Při importu epizod v `lib/tmdb.ts` (funkce `importShow`) doplň ukládání `ep.vote_average` a `ep.vote_count`.

### 1b. Nová tabulka `episode_people` (guest stars)

```sql
CREATE TABLE IF NOT EXISTS episode_people (
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  person_id  INTEGER NOT NULL REFERENCES people(id)   ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'guest',
  character_name TEXT,
  PRIMARY KEY (episode_id, person_id, role)
);
```

Při importu každé epizody zavolej `GET /tv/{tmdb_id}/season/{s}/episode/{e}/credits` a ulož `guest_stars` do `episode_people`. Použij existující `importCredits`-like logiku (INSERT OR IGNORE INTO people, pak INSERT OR IGNORE INTO episode_people).

### 1c. Funkce `syncEpisodes(show_id)`

Nová exportovaná funkce v `lib/tmdb.ts`:

- Načti všechny sezóny seriálu z TMDb (`/tv/{tmdb_id}?language=en-US`).
- Pro každou sezónu (kromě season 0) stáhni `/tv/{tmdb_id}/season/{n}?language=en-US`.
- Pokud sezóna v DB neexistuje → vlož ji a všechny epizody.
- Pokud sezóna existuje → pro každou epizodu:
  - Pokud epizoda neexistuje → vlož ji.
  - Pokud existuje → updatuj `title`, `description`, `air_date`, `runtime`, `still_url`, `vote_average`, `vote_count`.
- Updatuj `shows.last_air_date` a `shows.status`.

### 1d. API endpoint pro sync epizod

`app/api/admin/shows/[id]/sync-episodes/route.ts` — POST, chráněný NextAuth session (admin email), volá `syncEpisodes(id)`.

### 1e. Denní cron

`app/api/cron/sync-episodes/route.ts`:

- Autorizace přes hlavičku `Authorization: Bearer {CRON_SECRET}` (env proměnná).
- Načte všechny seriály s `active = 1` a `status != 'Ended'`.
- Pro každý zavolá `syncEpisodes(show_id)`.
- Vrátí JSON `{ synced: n }`.

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/sync-episodes", "schedule": "0 3 * * *" }
  ]
}
```

### 1f. Frontend — epizody na stránce seriálu

V `app/serialy/[slug]/page.tsx` (záložka Série):

- Zobraz `still_url` epizody (obrázek 16:9, malý thumbnail vlevo vedle názvu).
- Zobraz hodnocení epizody: `vote_average` s jednou desetinou a počet hlasů `vote_count` (šedě, malé).
- Pod hodnocením epizody zobraz guest stars: propojené linky na `/herci/{slug}` s malou fotkou a jménem.

---

## OKRUH 2 — Uživatelské účty a tracking

### 2a. DB schéma — nové tabulky

Přidej do `initSchema` v `lib/db.ts`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  password_hash TEXT,          -- NULL pro OAuth uživatele
  google_id  TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_episodes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  watched_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, episode_id)
);

CREATE TABLE IF NOT EXISTS user_show_ratings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  rating  INTEGER NOT NULL CHECK (rating IN (-1, 0, 1)),  -- -1 palec dolů, 0 check, 1 palec nahoru
  rated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, show_id)
);
```

Stav seriálu se odvozuje dynamicky z `user_episodes`:
- 0 epizod sledováno + seriál je v `user_show_ratings` nebo `user_episodes` → Watchlist (implementuj přes extra tabulku `user_watchlist`)
- ≥1 epizoda sledována, ne všechny → Sleduji
- Všechny epizody sledovány → Dokončeno

```sql
CREATE TABLE IF NOT EXISTS user_watchlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, show_id)
);
```

### 2b. Auth — rozšíření NextAuth

Soubor `lib/auth.ts` — přidej `CredentialsProvider` vedle stávajícího `GoogleProvider`:

- Stávající `GoogleProvider` musí zůstat funkční pro admina (callback `signIn` stále blokuje přihlášení admina jen pro `ADMIN_EMAIL`).
- Přidej nový `GoogleProvider` flow pro běžné uživatele (nebo uprav stávající — viz níže).
- `CredentialsProvider`: ověř email + heslo proti tabulce `users` pomocí `bcryptjs`.

**Pozor na admin vs. uživatel:** Stávající `signIn` callback vrací `true` jen pro `ADMIN_EMAIL`. To je potřeba změnit:
- Pokud se přihlašuje přes Google a email === `ADMIN_EMAIL` → OK (admin).
- Pokud se přihlašuje přes Credentials → ověř existenci v `users` tabulce → OK.
- Pokud se přihlašuje přes Google a není admin → vytvoř nebo najdi uživatele v `users` tabulce (podle `google_id`) → OK.

Do session callbacku přidej `session.user.id` (načti z DB podle emailu).
Přidej `session.user.isAdmin` flag (email === `ADMIN_EMAIL`).

Nainstaluj: `npm install bcryptjs @types/bcryptjs`

### 2c. Registrace

`app/registrace/page.tsx` — formulář: email, heslo (min 8 znaků), jméno (dobrovolné).

API `app/api/auth/register/route.ts` — POST:
- Validuj email a heslo.
- Zkontroluj unikátnost emailu.
- Zahashuj heslo `bcryptjs.hash(password, 12)`.
- Vlož do `users`.
- Vrať `{ ok: true }`.

### 2d. Přihlášení / odhlášení

`app/prihlaseni/page.tsx` — formulář email + heslo, odkaz na Google OAuth, odkaz na registraci.

Odhlášení — přidej do headeru tlačítko/odkaz `signOut()`.

### 2e. Nastavení účtu

`app/nastaveni/page.tsx` — chráněná stránka (redirect na `/prihlaseni` pokud nepřihlášen):
- Změna jména.
- Změna hesla (aktuální heslo + nové heslo).
- Dark/light theme přepínač.

API `app/api/user/settings/route.ts` — POST, autorizovaný endpoint.

### 2f. Dark/light theme

Nainstaluj `next-themes`:
```
npm install next-themes
```

- Wrap `app/layout.tsx` do `<ThemeProvider attribute="class" defaultTheme="dark">`.
- Přidej CSS proměnné do `globals.css` pro light mode (stávající dark hodnoty zůstanou jako výchozí).
- Přepínač v headeru i v nastavení.

### 2g. Tracking epizod — klientská komponenta

`components/EpisodeWatchButton.tsx` — tlačítko ✓ / nevyplněné kolečko vedle každé epizody:
- Pokud uživatel přihlášen: označí epizodu jako sledovanou/nesledevanou (toggle).
- Pokud nepřihlášen: odkaz na `/prihlaseni`.
- Optimistic update (okamžitě přepne stav, pak zavolá API).

API `app/api/user/episodes/route.ts` — POST `{ episode_id, watched: boolean }`.

### 2h. Watchlist tlačítko

`components/WatchlistButton.tsx` — tlačítko "Přidat do seznamu" / "V seznamu" na stránce každého seriálu:
- Toggle přidání/odebrání ze `user_watchlist`.

API `app/api/user/watchlist/route.ts` — POST `{ show_id, add: boolean }`.

### 2i. Hodnocení seriálu

`components/ShowRating.tsx` — tři tlačítka: 👎 / ✓ / 👍 na stránce seriálu:
- Zobraz jen přihlášeným uživatelům.
- Aktuálně vybrané hodnocení vizuálně zvýrazni.

API `app/api/user/rating/route.ts` — POST `{ show_id, rating: -1 | 0 | 1 | null }` (null = smazat hodnocení).

### 2i-admin. Přehled hodnocení v admin panelu

Na stránce detailu seriálu v adminu (`app/admin/serialy/[id]/page.tsx`) přidej sekci **Hodnocení uživatelů**:

- Zobraz agregovaný souhrn: počet 👎 / ✓ / 👍 a celkový počet hodnocení.
- Zobraz tabulku jednotlivých hodnocení: jméno uživatele (nebo email pokud nemá jméno), hodnocení (ikona), datum hodnocení.
- Data načítej server-side přímo z DB — endpoint není potřeba, stačí SQL dotaz na `user_show_ratings JOIN users`.

Příklad dotazu:
```sql
SELECT u.name, u.email, r.rating, r.rated_at
FROM user_show_ratings r
JOIN users u ON r.user_id = u.id
WHERE r.show_id = ?
ORDER BY r.rated_at DESC
```

Agregace:
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
  SUM(CASE WHEN rating = 0 THEN 1 ELSE 0 END) as check_mark,
  SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down
FROM user_show_ratings
WHERE show_id = ?
```

### 2j. Stránka seriálu — integrace

V `app/serialy/[slug]/page.tsx`:
- Přidej `WatchlistButton` a `ShowRating` do hlavičky seriálu.
- Pokud uživatel přihlášen, načti jeho stav (watchlist, hodnocení, počet shlédnutých epizod) a předej do komponent.
- V záložce Série zobraz u každé epizody `EpisodeWatchButton` a ukazatel sledování (kolik % epizod v sezóně sledoval).

### 2k. Profilová stránka

`app/profil/page.tsx` — chráněná stránka:

Tři sekce (tabs nebo sekce na stránce):
1. **Watchlist** — seriály z `user_watchlist` (jen ty bez sledovaných epizod).
2. **Sleduji** — seriály s alespoň 1 sledovanou epizodou, ale ne všemi.
3. **Dokončeno** — seriály, kde všechny epizody označeny jako sledované.

Každý seriál zobrazit jako `ShowCard` + přidej hodnocení (ikona 👎/✓/👍) pokud hodnotil.

Statistiky nahoře: celkem shlédnutých epizod, seriálů dokončeno, seriálů sledováno.

---

## Poznámky k implementaci

- **Neměň** stávající admin autentizaci — admin přistupuje přes Google OAuth a `ADMIN_EMAIL` env musí nadále fungovat.
- **Neměň** stávající DB schéma (jen přidávej).
- Všechny user API endpointy ověřuj přes `getServerSession(authOptions)` a vracejte 401 pokud není session.
- Existující `lib/db.ts` migrace fungují tak, že každý `ALTER TABLE` je v try/catch — přidej nové příkazy stejným způsobem.
- Soubory pro cron/admin API:
  - `app/api/cron/` → ověřuj `Authorization: Bearer {process.env.CRON_SECRET}`
  - `app/api/admin/` → ověřuj `session.user.isAdmin === true`
- Dark mode: stávající design je celý dark, light mode je bonus — klidně jen základní invertování přes Tailwind `dark:` třídy.

## Env proměnné k přidání

```
NEXTAUTH_SECRET=...        # pokud chybí, přidej
CRON_SECRET=...            # pro autorizaci cron endpointů
```

## Soubory které NESMÍŠ rozbít

- `lib/auth.ts` — admin callback musí zůstat funkční
- `lib/db.ts` — stávající migrace nesmí být odstraněny
- `lib/tmdb.ts` — stávající sync funkce musí zůstat
- `app/admin/**` — admin panel nesmí přestat fungovat
