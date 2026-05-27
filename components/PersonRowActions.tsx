'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PersonRowActions({ id, active }: { id: number; active: boolean }) {
  const [isActive, setIsActive] = useState(active)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function toggleActive(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    await fetch(`/api/admin/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_active', active: !isActive }),
    })
    setIsActive(!isActive)
    setLoading(false)
    router.refresh()
  }

  async function deletePerson(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    await fetch(`/api/admin/people/${id}`, { method: 'DELETE' })
    setDeleting(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {/* Eye toggle */}
      <button
        onClick={toggleActive}
        disabled={loading}
        title={isActive ? 'Skrýt herce' : 'Zobrazit herce'}
        className={`p-1.5 rounded-lg transition-colors ${isActive ? 'text-gray-500 hover:text-white' : 'text-accent-hover hover:text-accent'}`}
      >
        {isActive ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" x2="22" y1="2" y2="22"/>
          </svg>
        )}
      </button>

      {/* Edit */}
      <Link
        href={`/admin/herci/${id}`}
        onClick={e => e.stopPropagation()}
        title="Upravit"
        className="p-1.5 rounded-lg text-gray-500 hover:text-accent transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </Link>

      {/* Delete */}
      {confirm ? (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={deletePerson}
            disabled={deleting}
            title="Potvrdit smazání"
            className="px-2 py-0.5 text-xs rounded bg-red-900/60 text-red-400 hover:bg-red-800 border border-red-800 transition-colors disabled:opacity-50"
          >
            {deleting ? '...' : 'Smazat'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirm(false) }}
            className="px-2 py-0.5 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            Zrušit
          </button>
        </div>
      ) : (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirm(true) }}
          title="Smazat herce"
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      )}
    </div>
  )
}
