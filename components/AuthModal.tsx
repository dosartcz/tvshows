'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAuthModal } from '@/lib/auth-modal'

export default function AuthModal() {
  const { isOpen, closeAuthModal } = useAuthModal()
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  if (!isOpen) return null

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const res = await signIn('credentials', { email: loginEmail, password: loginPassword, redirect: false })
    setLoginLoading(false)
    if (res?.ok) {
      closeAuthModal()
      router.refresh()
    } else {
      setLoginError('Nesprávný email nebo heslo.')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
    if (regPassword.length < 8) {
      setRegError('Heslo musí mít alespoň 8 znaků.')
      return
    }
    setRegLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regEmail, password: regPassword, name: regName }),
    })
    const data = await res.json()
    if (!res.ok) {
      setRegError(data.error ?? 'Chyba při registraci.')
      setRegLoading(false)
      return
    }
    await signIn('credentials', { email: regEmail, password: regPassword, redirect: false })
    setRegLoading(false)
    closeAuthModal()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAuthModal} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-sm">
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className="px-6 pt-12 pb-6">
          <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'login' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Přihlásit se
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'register' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Registrovat
            </button>
          </div>
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="input" placeholder="vas@email.cz" />
            </div>
            <div>
              <label className="label">Heslo</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="input" />
            </div>
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="btn-primary w-full">
              {loginLoading ? 'Přihlašuji...' : 'Přihlásit se'}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
              <div className="relative flex justify-center text-xs text-gray-500"><span className="bg-gray-900 px-2">nebo</span></div>
            </div>
            <button
              type="button"
              disabled={googleLoading}
              onClick={async () => { setGoogleLoading(true); await signIn('google', { callbackUrl: '/' }) }}
              className="btn-secondary w-full flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              {googleLoading ? 'Přesměrovávám...' : 'Přihlásit přes Google'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label">Jméno (dobrovolné)</label>
              <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="input" placeholder="Vaše jméno" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required className="input" placeholder="vas@email.cz" />
            </div>
            <div>
              <label className="label">Heslo (min. 8 znaků)</label>
              <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={8} className="input" />
            </div>
            {regError && <p className="text-red-400 text-sm">{regError}</p>}
            <button type="submit" disabled={regLoading} className="btn-primary w-full">
              {regLoading ? 'Registruji...' : 'Vytvořit účet'}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
              <div className="relative flex justify-center text-xs text-gray-500"><span className="bg-gray-900 px-2">nebo</span></div>
            </div>
            <button
              type="button"
              disabled={googleLoading}
              onClick={async () => { setGoogleLoading(true); await signIn('google', { callbackUrl: '/' }) }}
              className="btn-secondary w-full flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              {googleLoading ? 'Přesměrovávám...' : 'Registrovat přes Google'}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  )
}

