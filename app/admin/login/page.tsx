'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-white mb-2">TVShows.cz</h1>
        <p className="text-gray-500 text-sm mb-8">Admin přístup</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/admin' })}
          className="btn-primary w-full"
        >
          Přihlásit přes Google
        </button>
      </div>
    </div>
  )
}
