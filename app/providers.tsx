'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { AuthModalProvider } from '@/lib/auth-modal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <AuthModalProvider>
          {children}
        </AuthModalProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
