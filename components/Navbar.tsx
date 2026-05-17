'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const links = [
  { href: '/serialy', label: 'Seriály' },
  { href: '/herci', label: 'Herci' },
  { href: '/clanky', label: 'Články' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (pathname.startsWith('/admin')) return null

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="text-xl font-bold text-amber-400 tracking-tight">
          TVShows.cz
        </Link>

        <div className="flex items-center gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'text-amber-400'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              {label}
            </Link>
          ))}
          {session && (
            <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors">
              Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
