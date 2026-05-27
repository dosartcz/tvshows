'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin) return <>{children}</>

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <footer className="border-t border-gray-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} TVShows.cz</p>
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
              alt="TMDB"
              height={12}
              style={{ height: '12px', width: 'auto' }}
            />
            <span className="text-xs text-gray-600">This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
          </a>
        </div>
      </footer>
    </>
  )
}
