'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface CastMember { id: number; name: string; photo_url?: string; role: string; character_name?: string }
interface PersonResult { tmdb_id: number; name: string; photo_url?: string }

const ROLES = ['actor', 'director', 'creator', 'writer'] as const

export default function ShowCastPage() {
  const { id } = useParams() as { id: string }
  const [cast, setCast] = useState<CastMember[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonResult[]>([])
  const [newRole, setNewRole] = useState<string>('actor')
  const [newChar, setNewChar] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCast() }, [id])

  async function loadCast() {
    const res = await fetch(`/api/admin/shows/${id}/cast`)
    setCast(await res.json())
  }

  async function searchPeople() {
    if (!query.trim()) return
    setLoading(true)
    const res = await fetch(`/api/admin/tmdb/import-person?q=${encodeURIComponent(query)}`)
    setResults(await res.json())
    setLoading(false)
  }

  async function addPerson(tmdbId: number) {
    // Import person first
    await fetch('/api/admin/tmdb/import-person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId }),
    })
    // Get person id from DB
    const peopleRes = await fetch('/api/admin/people')
    const people = await peopleRes.json()
    const person = people.find((p: any) => p.tmdb_id === tmdbId)
    if (!person) return

    await fetch(`/api/admin/shows/${id}/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: person.id, role: newRole, character_name: newChar || null }),
    })
    setResults([])
    setQuery('')
    setNewChar('')
    loadCast()
  }

  async function syncCast() {
    setSyncing(true)
    await fetch(`/api/admin/shows/${id}/cast`, { method: 'PUT' })
    await loadCast()
    setSyncing(false)
    setSyncMsg('Hotovo!')
    setTimeout(() => setSyncMsg(''), 3000)
  }

  async function removeCast(person_id: number, role: string) {
    await fetch(`/api/admin/shows/${id}/cast`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id, role }),
    })
    loadCast()
  }

  function startEdit(c: CastMember) {
    setEditingKey(`${c.id}-${c.role}`)
    setEditValue(c.character_name ?? '')
  }

  async function saveEdit(person_id: number, role: string) {
    await fetch(`/api/admin/shows/${id}/cast`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id, role, character_name: editValue || null }),
    })
    setEditingKey(null)
    loadCast()
  }

  const roleLabel: Record<string, string> = {
    actor: 'Herec', director: 'Režisér', creator: 'Tvůrce', writer: 'Scenárista'
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/admin/serialy/${id}`} className="text-accent hover:text-accent-hover">← Zpět</Link>
        <h1 className="text-2xl font-bold text-white">Obsazení</h1>
        <button onClick={syncCast} disabled={syncing} className="btn-secondary text-sm ml-auto">
          {syncing ? 'Načítám...' : '↻ Sync z TMDB'}
        </button>
        {syncMsg && <span className="text-sm text-green-400">{syncMsg}</span>}
      </div>

      {/* Add person */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-8">
        <h2 className="font-semibold text-gray-200 mb-4">Přidat osobu</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchPeople()}
            placeholder="Hledat na TMDb..." className="input max-w-xs" />
          <button onClick={searchPeople} disabled={loading} className="btn-secondary text-sm">
            {loading ? 'Hledám...' : 'Hledat'}
          </button>
          <select value={newRole} onChange={e => setNewRole(e.target.value)} className="input w-auto">
            {ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </select>
          <input value={newChar} onChange={e => setNewChar(e.target.value)}
            placeholder="Postava (pro herce)" className="input max-w-xs" />
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {results.slice(0, 8).map(r => (
              <button key={r.tmdb_id} onClick={() => addPerson(r.tmdb_id)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg p-2 text-left transition-colors">
                {r.photo_url && <Image src={r.photo_url} alt="" width={40} height={40} className="rounded-full object-cover flex-shrink-0" />}
                <span className="text-sm text-gray-200 line-clamp-1">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current cast */}
      <div className="space-y-2">
        {cast.map(c => {
          const key = `${c.id}-${c.role}`
          const isEditing = editingKey === key
          return (
            <div key={key} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              {c.photo_url && <Image src={c.photo_url} alt="" width={36} height={36} className="rounded-full object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200">{c.name}</p>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(c.id, c.role); if (e.key === 'Escape') setEditingKey(null) }}
                      className="input text-xs py-0.5 px-2 h-7 w-64"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(c.id, c.role)} className="text-xs text-green-400 hover:text-green-300">Uložit</button>
                    <button onClick={() => setEditingKey(null)} className="text-xs text-gray-500 hover:text-gray-300">Zrušit</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{roleLabel[c.role]}{c.character_name ? ` · ${c.character_name}` : ''}</p>
                )}
              </div>
              {!isEditing && (
                <button onClick={() => startEdit(c)} className="text-gray-500 hover:text-gray-300 text-xs">Upravit</button>
              )}
              <button onClick={() => removeCast(c.id, c.role)} className="text-accent-hover hover:text-accent text-xs">
                Odebrat
              </button>
            </div>
          )
        })}
        {cast.length === 0 && <p className="text-gray-600 text-sm">Žádné obsazení.</p>}
      </div>
    </div>
  )
}
