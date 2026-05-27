import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import AuthModal from '@/components/AuthModal'
import ConditionalLayout from '@/components/ConditionalLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'TVShows.cz', template: '%s | TVShows.cz' },
  description: 'Databáze US a UK televizních seriálů',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className="dark">
      <body className={inter.className}>
        <Providers>
          <AuthModal />
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  )
}
