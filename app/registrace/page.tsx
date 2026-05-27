'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Chyba při registraci.')
      setLoading(false)
      return
    }
    // Auto-login after registration
    await signIn('credentials', { email, password, redirect: false })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">Registrace</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Jméno (dobrovolné)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Vaše jméno"
            />
          </div>
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
            <label className="label">Heslo (min. 8 znaků)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="input"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Registruji...' : 'Vytvořit účet'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Již máte účet?{' '}
          <Link href="/prihlaseni" className="text-accent hover:text-accent-hover">
            Přihlásit se
          </Link>
        </p>
      </div>
    </div>
  )
}
