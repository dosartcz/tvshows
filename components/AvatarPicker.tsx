'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'

interface Person {
  id: number
  name: string
  slug: string
  photo_url: string
}

interface Props {
  currentAvatar: string | null
  onSaved: () => void
}

export default function AvatarPicker({ currentAvatar, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [selected, setSelected] = useState<string | null>(currentAvatar)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || people.length > 0) return
    setLoading(true)
    fetch('/api/user/avatar')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPeople(data) })
      .catch(err => console.error('avatar fetch error:', err))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return people
    const q = search.toLowerCase()
    return people.filter(p => p.name.toLowerCase().includes(q))
  }, [people, search])

  async function save() {
    if (!selected) return
    setSaving(true)
    const res = await fetch('/api/user/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: selected }),
    })
    setSaving(false)
    if (res.ok) { setOpen(false); onSaved() }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        Změnit avatar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <h2 className="text-lg font-semibold text-white">Vyber avatar</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-800 shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Hledat herce nebo tvůrce..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto p-4 flex-1">
              {loading ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">Žádné výsledky</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {filtered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.photo_url)}
                      title={p.name}
                      className={`relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all focus:outline-none ${
                        selected === p.photo_url ? 'border-accent scale-105' : 'border-transparent hover:border-gray-600'
                      }`}
                    >
                      <Image src={p.photo_url} alt={p.name} fill className="object-cover object-top" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-500">
                {filtered.length} {filtered.length === 1 ? 'osoba' : 'osob'} z tvých seriálů
              </p>
              <div className="flex gap-3">
                <button onClick={() => setOpen(false)} className="btn-secondary text-sm">Zrušit</button>
                <button onClick={save} disabled={saving || !selected} className="btn-primary text-sm">
                  {saving ? 'Ukládám...' : 'Uložit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
