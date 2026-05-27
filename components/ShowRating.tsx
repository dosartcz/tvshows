'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/lib/auth-modal'

interface Props {
  showId: number
  initialRating: number | null
  canRate?: boolean
}

const options = [
  {
    value: -1,
    title: 'Nelíbí se mi',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
      </svg>
    ),
  },
  {
    value: 0,
    title: 'OK',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    ),
  },
  {
    value: 1,
    title: 'Líbí se mi',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
      </svg>
    ),
  },
]

export default function ShowRating({ showId, initialRating, canRate = false }: Props) {
  const { data: session } = useSession()
  const { openAuthModal } = useAuthModal()
  const [rating, setRating] = useState<number | null>(initialRating)
  const [loading, setLoading] = useState(false)

  const isLoggedIn = !!(session?.user as any)?.id

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-1" title="Přihlaste se pro hodnocení">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={openAuthModal}
            className="w-9 h-9 rounded-lg border border-gray-800 flex items-center justify-center text-gray-700 hover:border-gray-600 hover:text-gray-500 transition-colors"
          >
            {opt.icon}
          </button>
        ))}
      </div>
    )
  }

  if (!canRate) {
    return (
      <div className="flex items-center gap-1" title="Hodnotit můžeš až po shlédnutí celého seriálu">
        {options.map(opt => (
          <div
            key={opt.value}
            className="w-9 h-9 rounded-lg border border-gray-800 flex items-center justify-center text-gray-700 cursor-not-allowed"
          >
            {opt.icon}
          </div>
        ))}
      </div>
    )
  }

  async function rate(value: number) {
    if (loading) return
    const newRating = rating === value ? null : value
    setRating(newRating)
    setLoading(true)
    try {
      await fetch('/api/user/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_id: showId, rating: newRating }),
      })
    } catch {
      setRating(rating)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => rate(opt.value)}
          disabled={loading}
          title={opt.title}
          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
            rating === opt.value
              ? 'bg-accent border-accent text-gray-950'
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}
