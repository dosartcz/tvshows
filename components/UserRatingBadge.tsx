'use client'

import { useState, useEffect } from 'react'

interface Props {
  initialRating: number | null
}

const ThumbDown = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
  </svg>
)
const Check = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
)
const ThumbUp = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
  </svg>
)

const config: Record<number, { label: string; icon: JSX.Element; color: string; bg: string; border: string }> = {
  1:  { label: 'LÍBÍ SE MI',   icon: <ThumbUp size={20} />,   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  0:  { label: 'OK',           icon: <Check size={20} />,     color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  '-1': { label: 'NELÍBÍ SE MI', icon: <ThumbDown size={20} />, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
}

export default function UserRatingBadge({ initialRating }: Props) {
  const [rating, setRating] = useState<number | null>(initialRating)

  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent<number | null>).detail
      setRating(value)
    }
    window.addEventListener('user-rating-updated', handler)
    return () => window.removeEventListener('user-rating-updated', handler)
  }, [])

  if (rating === null) return null

  const c = config[rating]
  if (!c) return null

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${c.bg} ${c.border}`}>
      <span className={`${c.color} font-bold`}>{c.icon}</span>
      <span className={`${c.color} font-bold text-lg leading-none`}>{c.label}</span>
    </div>
  )
}
