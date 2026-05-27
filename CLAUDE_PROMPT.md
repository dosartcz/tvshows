# Prompt pro Claude Code — TVShows.cz úpravy

## Kontext projektu

Next.js 14 App Router, TypeScript, Tailwind CSS, SQLite (lokálně) / Turso libsql (produkce).
NextAuth v4 — Google OAuth pro admina, Credentials + Google pro uživatele.
Accent barva: `#fbbf24` (amber-400), definovaná v `tailwind.config.ts` jako `accent`.
Tmavý design, třída `.card` = `bg-gray-900 border border-gray-800 rounded-lg`.

Pracovní adresář: kořen projektu (kde je `package.json`).

---

## Změny k implementaci

### 1. Admin Dashboard — počet registrovaných uživatelů

V `app/admin/page.tsx` přidat do `Promise.all` dotaz na `SELECT COUNT(*) as c FROM users`
a přidat dlaždici „Uživatelé" do pole `stats` (stejný styl jako ostatní dlaždice).

---

### 2. Stránka epizody

Vytvořit novou stránku `app/serialy/[slug]/sezona/[season]/epizoda/[episode]/page.tsx`.

**URL vzor:** `/serialy/breaking-bad/sezona/1/epizoda/3`
Params: `slug` (show slug), `season` (season_number), `episode` (episode_number).

**Data k zobrazení:**
- Název epizody, číslo (S01E03), datum vysílání, stopáž
- Náhledový obrázek (`still_url`) — pokud existuje, velký banner nahoře
- Popis epizody (`description` nebo `description_cs` pokud existuje)
- Hodnocení TMDb (`vote_average`, `vote_count`)
- Guest stars z tabulky `episode_people` (JOIN přes `people`) — fotka, jméno, postava
- Tlačítko označit jako shlédnuté (komponenta `EpisodeWatchButton` již existuje)
- Breadcrumb navigace: Seriály → [název seriálu] → Sezóna X → Epizoda Y
- V sidebaru: placeholder reklamní banner 160×600 px (stejný styl jako na `/serialy/[slug]` a `/herci/[slug]`)

**SQL:**
```sql
SELECT e.*, s.title as show_title, s.slug as show_slug,
       sea.season_number, sea.name as season_name
FROM episodes e
JOIN seasons sea ON e.season_id = sea.id
JOIN shows s ON e.show_id = s.id
WHERE s.slug = ? AND sea.season_number = ? AND e.episode_number = ?
```

Guest stars:
```sql
SELECT p.name, p.slug, p.photo_url, ep.character_name
FROM episode_people ep
JOIN people p ON ep.person_id = p.id
WHERE ep.episode_id = ? AND ep.role = 'guest_star'
```

Na stránce seriálu (`app/serialy/[slug]/page.tsx`) přidat odkaz z každé epizody na tuto novou stránku.

---

### 3. Přihlašovací popup (modal)

Vytvořit client komponentu `components/AuthModal.tsx` — modal dialog pro přihlášení i registraci.

**Požadavky:**
- Zobrazí se přes celou obrazovku (overlay), zavíratelný křížkem nebo kliknutím mimo
- Přepínání mezi záložkami „Přihlásit se" a „Registrovat"
- Přihlášení: email + heslo + tlačítko Google OAuth
- Registrace: email + heslo + volitelné jméno + tlačítko Google OAuth
- Při úspěchu zavřít modal a refresh stránky (`router.refresh()`)
- Chybové hlášky inline (špatné heslo apod.)
- Stránky `/prihlaseni` a `/registrace` zachovat, ale upravit je aby renderovaly stejný formulář (lze importovat sdílené komponenty)

Vytvořit context nebo Zustand store (nebo jednoduchý custom hook `useAuthModal`) pro globální řízení viditelnosti modalu — `openAuthModal()` volatelné odkudkoli.

Přidat `AuthModal` do root layoutu (`app/layout.tsx`) ať je dostupný globálně.

---

### 4. Tlačítka sledování — viditelná bez přihlášení

Komponenty `EpisodeWatchButton`, `WatchlistButton`, `ShowRating` a `MarkAllWatchedButton`:
- Zobrazovat vždy (i nepřihlášeným uživatelům)
- Pokud uživatel není přihlášen a klikne na tlačítko → zavolat `openAuthModal()` místo akce
- Přihlášeným fungují jako dosud

---

### 5. Aktuality — zrušení vlastních stránek článků

**Smazat:** `app/clanky/[id]/page.tsx` (celý adresář)

**Upravit `components/ArticleCard.tsx`:**
- Všechny varianty (`horizontal`, `vertical`) — změnit `href` z `/clanky/${article.id}` na `article.url` (originální odkaz)
- Přidat `target="_blank" rel="noopener noreferrer"` na všechny linky článků
- Změnit komponentu z `<Link>` na `<a>` (externí odkaz)

---

### 6. Aktuality na úvodní stránce — redesign karet

V `app/page.tsx` sekce aktualit (aktuálně zobrazuje 8 článků):

- Změnit na **grid 4 sloupce** (na desktopu), 2 na mobilu
- Každá karta bude **vyšší** — obrázek nahoře (aspect-video), pod ním celý titulek bez `line-clamp`, pak celý popis (`description_cs || description`) bez `line-clamp`, datum, zdroj a odkaz na originál
- Karta bude `<a href={article.url} target="_blank">` (ne Link na interní stránku)
- Zachovat zobrazení seriálu (badge přes obrázek)
- Limit článků: 8

---

### 7. Stránka Aktuality (`app/clanky/page.tsx`) — redesign

- Rozložení změnit z řádků na **grid karet** stejný styl jako na homepage (obrázek nahoře, titulek, popis, datum, zdroj, název seriálu)
- Každá karta odkazuje přímo na originální URL (`article.url`), `target="_blank"`
- Max **12 článků** na stránku, pak stránkování (komponenta `Pagination` již existuje)
- Pod obrázkem zobrazit ke kterému seriálu článek patří (pokud existuje vazba v `article_shows`)
- SQL pro stránku:
```sql
SELECT a.*,
  GROUP_CONCAT(s.title, '||') as show_titles,
  GROUP_CONCAT(s.slug, '||') as show_slugs
FROM articles a
LEFT JOIN article_shows ars ON a.id = ars.article_id
LEFT JOIN shows s ON ars.show_id = s.id
GROUP BY a.id
ORDER BY a.published_at DESC
LIMIT 12 OFFSET ?
```

---

### 8. Narozeni tento den — redesign

V `app/page.tsx` sekce narozenin aktuálně vypadá jako horizontální scrollovatelný pruh.

**Nový design — stejný styl jako ostatní sekce na homepage:**

```tsx
{birthdays.length > 0 && (
  <section>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white">Narozeni tento den</h2>
    </div>
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
      {birthdays.slice(0, 8).map((p: any) => (
        <Link key={p.id} href={`/herci/${p.slug}`} className="group flex flex-col items-center text-center gap-2">
          <div className="relative w-full rounded-lg overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-accent transition-colors" style={{aspectRatio: '2/3'}}>
            {p.photo_url ? (
              <Image src={p.photo_url} alt={p.name} fill className="object-cover object-top" sizes="120px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600">👤</div>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-300 group-hover:text-accent transition-colors line-clamp-2">{p.name}</p>
            {p.death_date ? (
              <p className="text-xs text-gray-600">† {new Date(p.death_date).getFullYear() - new Date(p.birth_date).getFullYear()} let</p>
            ) : (
              <p className="text-xs text-gray-600">{new Date().getFullYear() - new Date(p.birth_date).getFullYear()} let</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  </section>
)}
```

Limit: 8 osob. Bez horizontálního scrollu.

---

### 9. Profil — reklamní banner

V `app/profil/page.tsx` přidat úplně dole (za veškerým obsahem) full-width placeholder pro Google Ads leaderboard.

Doporučený rozměr Google Ads: **728×90 px** (leaderboard), na mobilu **320×50 px**.

```tsx
{/* Reklamní banner */}
<div className="mt-12 flex justify-center">
  <div className="w-full max-w-[728px] h-[90px] bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center">
    <span className="text-gray-700 text-xs">Reklama 728×90</span>
  </div>
</div>
```

Na mobilu (pod 728px) použít `320×50`:
```tsx
<div className="mt-12 flex justify-center">
  <div className="hidden sm:flex w-full max-w-[728px] h-[90px] bg-gray-900 border border-gray-800 rounded-lg items-center justify-center">
    <span className="text-gray-700 text-xs">Reklama 728×90</span>
  </div>
  <div className="flex sm:hidden w-[320px] h-[50px] bg-gray-900 border border-gray-800 rounded-lg items-center justify-center">
    <span className="text-gray-700 text-xs">Reklama 320×50</span>
  </div>
</div>
```

---

## Poznámky k implementaci

- Zachovat konzistentní design — tmavé pozadí, accent `#fbbf24`, `.card` třída
- `export const dynamic = 'force-dynamic'` na všech server stránkách které čtou session nebo DB
- Všechny nové API routes chránit `getServerSession(authOptions)` kde je to relevantní
- Nemazat existující funkční kód pokud není explicitně uvedeno
