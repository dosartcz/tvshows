'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import AvatarPicker from '@/components/AvatarPicker'

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [nameMsg, setNameMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/prihlaseni')
    if (session?.user?.name) setName(session.user.name)
  }, [status, session, router])

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center text-gray-500">Načítám...</div>
  if (!session) return null

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_name', name }),
    })
    setSaving(false)
    const data = await res.json()
    if (res.ok) {
      await update()
      setNameMsg('Uloženo!')
    } else {
      setNameMsg(data.error ?? 'Chyba.')
    }
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_password', currentPassword, newPassword }),
    })
    setSaving(false)
    const data = await res.json()
    if (res.ok) {
      setCurrentPassword('')
      setNewPassword('')
      setPwMsg('Heslo změněno!')
    } else {
      setPwMsg(data.error ?? 'Chyba.')
    }
    setTimeout(() => setPwMsg(''), 3000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-white mb-8">Nastavení účtu</h1>

      <div className="space-y-8">
        {!(session?.user as any)?.image && (
          <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Avatar</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-700 shrink-0">
                {(session?.user as any)?.avatarUrl ? (
                  <Image src={(session.user as any).avatarUrl} alt="Avatar" fill className="object-cover object-top" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                    {(session?.user?.name ?? session?.user?.email ?? '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <AvatarPicker currentAvatar={(session?.user as any)?.avatarUrl ?? null} onSaved={() => update()} />
            </div>
          </section>
        )}

        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Jméno</h2>
          <form onSubmit={saveName} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Vaše jméno"
            />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn bg-gray-700 hover:bg-gray-600 text-gray-100 focus:ring-gray-600">Uložit jméno</button>
              {nameMsg && <span className="text-sm text-green-400">{nameMsg}</span>}
            </div>
          </form>
        </section>

        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Změna hesla</h2>
          <form onSubmit={savePassword} className="space-y-3">
            <div>
              <label className="label">Aktuální heslo</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Nové heslo (min. 8 znaků)</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={8}
                className="input"
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className="btn bg-gray-700 hover:bg-gray-600 text-gray-100 focus:ring-gray-600">Změnit heslo</button>
              {pwMsg && <span className={`text-sm ${pwMsg.includes('Heslo') ? 'text-green-400' : 'text-red-400'}`}>{pwMsg}</span>}
            </div>
          </form>
        </section>

        <section className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Vzhled</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Tmavý / Světlý režim</span>
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
            <span className="text-sm text-gray-500">{mounted ? (theme === 'dark' ? 'Tmavý' : 'Světlý') : 'Tmavý'}</span>
          </div>
        </section>

        <div className="pt-2">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="btn-primary"
          >
            Odhlásit se
          </button>
        </div>
      </div>
    </div>
  )
}
