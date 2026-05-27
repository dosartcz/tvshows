import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/serialy', label: 'Seriály' },
  { href: '/admin/herci', label: 'Herci' },
  { href: '/admin/franchise', label: 'Franchise' },
  { href: '/admin/clanky', label: 'Aktuality' },
  { href: '/admin/rss', label: 'RSS zdroje' },
  { href: '/admin/nastaveni', label: 'Nastavení' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <Link href="/" className="text-lg font-bold text-accent">TVShows.cz</Link>
          <p className="text-xs text-gray-500 mt-0.5">Admin</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-600 truncate">{session.user?.email}</p>
          <Link href="/api/auth/signout" className="text-xs text-gray-500 hover:text-gray-300 mt-1 block">
            Odhlásit se
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
