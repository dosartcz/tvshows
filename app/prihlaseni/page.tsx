'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: 'Přihlášení přes Google selhalo. Zkuste to znovu.',
  OAuthSignin: 'Nelze spustit přihlášení přes Google.',
  Callback: 'Chyba při přihlášení. Zkuste to znovu.',
  Default: 'Nastala chyba při přihlášení.',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Nesprávný email nebo heslo.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">Přihlášení</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input"
              placeholder="vas@email.cz"
            />
          </div>
          <div>
            <label className="label">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input"
            />
          </div>
          {(error || oauthError) && (
            <p className="text-red-400 text-sm">
              {error || ERROR_MESSAGES[oauthError!] || ERROR_MESSAGES.Default}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Přihlašuji...' : 'Přihlásit se'}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-500">
              <span className="bg-gray-950 px-2">nebo</span>
            </div>
          </div>
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="btn-secondary w-full mt-4"
          >
            Přihlásit přes Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Nemáte účet?{' '}
          <Link href="/registrace" className="text-accent hover:text-accent-hover">
            Registrovat se
          </Link>
        </p>
      </div>
    </div>
  )
}
