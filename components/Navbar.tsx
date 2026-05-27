'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useAuthModal } from '@/lib/auth-modal'

const links = [
  { href: '/serialy', label: 'Seriály' },
  { href: '/herci', label: 'Herci' },
  { href: '/clanky', label: 'Aktuality' },
]

type Show = { id: number; title: string; slug: string; poster_url: string | null; rating_imdb: number | null; first_air_date: string | null }
type Person = { id: number; name: string; slug: string; photo_url: string | null }

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { openAuthModal } = useAuthModal()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ shows: Show[]; people: Person[] } | null>(null)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(query.trim()), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setOpen(false)
    setQuery('')
    router.push(`/serialy?q=${encodeURIComponent(q)}`)
  }

  const handleSelect = () => {
    setOpen(false)
    setQuery('')
  }

  const hasResults = results && (results.shows.length > 0 || results.people.length > 0)

  if (pathname.startsWith('/admin')) return null

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 h-16">
        <Link href="/" className="text-xl font-bold text-accent tracking-tight shrink-0">
          TVShows.cz
        </Link>

        <div ref={containerRef} className="relative flex-1 max-w-sm">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => hasResults && setOpen(true)}
                placeholder="Hledat seriál nebo herce..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </form>

          {open && hasResults && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
              {results!.shows.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 px-3 pt-2 pb-1 uppercase tracking-wider">Seriály</p>
                  {results!.shows.map(show => (
                    <Link
                      key={show.id}
                      href={`/serialy/${show.slug}`}
                      onClick={handleSelect}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-8 h-11 rounded-lg overflow-hidden shrink-0 bg-gray-800">
                        {show.poster_url && (
                          <Image src={show.poster_url} alt={show.title} width={32} height={44} className="object-cover w-full h-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-100 truncate">{show.title}</p>
                        <p className="text-xs text-gray-500">
                          {show.first_air_date ? show.first_air_date.slice(0, 4) : ''}
                          {show.rating_imdb ? ` · ★ ${show.rating_imdb.toFixed(1)}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {results!.people.length > 0 && (
                <div className="border-t border-gray-800">
                  <p className="text-xs text-gray-500 px-3 pt-2 pb-1 uppercase tracking-wider">Herci</p>
                  {results!.people.map(person => (
                    <Link
                      key={person.id}
                      href={`/herci/${person.slug}`}
                      onClick={handleSelect}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gray-800">
                        {person.photo_url && (
                          <Image src={person.photo_url} alt={person.name} width={32} height={32} className="object-cover w-full h-full" />
                        )}
                      </div>
                      <p className="text-sm text-gray-100 truncate">{person.name}</p>
                    </Link>
                  ))}
                </div>
              )}
              {query.trim().length >= 2 && (
                <button
                  onClick={handleSearch as any}
                  className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-gray-800 border-t border-gray-800 transition-colors"
                >
                  Zobrazit všechny výsledky pro &bdquo;{query.trim()}&ldquo; →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'text-accent'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Přepnout režim"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              !mounted || theme === 'dark' ? 'bg-gray-700' : 'bg-amber-400'
            }`}
          >
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform ${
              !mounted || theme === 'dark' ? 'translate-x-1' : 'translate-x-6'
            }`}>
              {!mounted || theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              )}
            </span>
          </button>
          {(session?.user as any)?.id ? (
            <div className="flex items-center gap-3">
              <Link href="/profil" className="text-sm text-gray-400 hover:text-gray-100 transition-colors">Profil</Link>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-gray-100 transition-colors">Odhlásit</button>
            </div>
          ) : (
            <button onClick={openAuthModal} className="text-sm text-gray-400 hover:text-gray-100 transition-colors">Přihlásit</button>
          )}
        </div>
      </div>
    </nav>
  )
}
