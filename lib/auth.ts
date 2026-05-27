import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { dbGet, dbRun } from './db'

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: '/prihlaseni',
    error: '/prihlaseni',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Heslo', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await dbGet<{ id: number; email: string; name: string | null; password_hash: string | null }>(
          'SELECT id, email, name, password_hash FROM users WHERE email = ?',
          [credentials.email]
        )
        if (!user?.password_hash) return null
        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) return null
        return { id: String(user.id), email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true
      if (account?.provider === 'google') {
        if (!user.email) return false
        return true  // upsert přesunut do jwt callbacku
      }
      return false
    },

    async jwt({ token, user, account, trigger }) {
      // Google OAuth — upsert uživatele a nastavení tokenu v jednom místě
      if (account?.provider === 'google' && user?.email) {
        token.email = user.email
        token.isAdmin = user.email === process.env.ADMIN_EMAIL

        try {
            // Vytvoř uživatele pokud neexistuje
            await dbRun(
              'INSERT OR IGNORE INTO users (email, name, google_id) VALUES (?, ?, ?)',
              [user.email, user.name ?? null, account.providerAccountId]
            )
            // Doplň google_id pokud se přihlašuje existující email/password účet
            await dbRun(
              'UPDATE users SET google_id = ?, name = COALESCE(name, ?) WHERE email = ? AND google_id IS NULL',
              [account.providerAccountId, user.name ?? null, user.email]
            )
            // Vždy načti z DB — nespoléhej na lastInsertRowid
            const dbUser = await dbGet<{ id: number; name: string | null; avatar_url: string | null }>(
              'SELECT id, name, avatar_url FROM users WHERE email = ?',
              [user.email]
            )
            token.userId = dbUser?.id ? Number(dbUser.id) : null
            token.avatarUrl = dbUser?.avatar_url ?? null
            if (dbUser?.name) token.name = dbUser.name
          } catch (err) {
            console.error('[auth] Google JWT DB error:', err)
          }
        return token
      }

      // Credentials přihlášení nebo obnova session
      if (user || account) {
        const email = (user?.email ?? token.email) ?? null
        token.isAdmin = email === process.env.ADMIN_EMAIL
        const dbUser = await dbGet<{ id: number; name: string | null; avatar_url: string | null }>(
          'SELECT id, name, avatar_url FROM users WHERE email = ?',
          [email]
        )
        token.userId = dbUser?.id ?? null
        if (dbUser?.name) token.name = dbUser.name
        token.avatarUrl = dbUser?.avatar_url ?? null
      }

      // Fallback: pokud userId chybí (stará cookie)
      if (token.userId == null && token.email && !token.isAdmin) {
        const dbUser = await dbGet<{ id: number; name: string | null; avatar_url: string | null }>(
          'SELECT id, name, avatar_url FROM users WHERE email = ?',
          [token.email]
        )
        token.userId = dbUser?.id ?? null
        if (dbUser?.name) token.name = dbUser.name
        token.avatarUrl = dbUser?.avatar_url ?? null
      }

      // Refresh z DB po session update()
      if (trigger === 'update' && token.email) {
        const dbUser = await dbGet<{ name: string | null; avatar_url: string | null }>(
          'SELECT name, avatar_url FROM users WHERE email = ?',
          [token.email]
        )
        token.name = dbUser?.name ?? token.name
        token.avatarUrl = dbUser?.avatar_url ?? token.avatarUrl
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId ?? null;
        (session.user as any).isAdmin = token.isAdmin ?? false;
        (session.user as any).avatarUrl = token.avatarUrl ?? null
        if (token.name) session.user.name = token.name as string
      }
      return session
    },
  },
}
