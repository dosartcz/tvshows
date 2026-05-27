'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function EditPersonPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [person, setPerson] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [translating, setTranslating] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/people`).then(r => r.json()).then((people: any[]) => {
      setPerson(people.find(p => p.id === Number(id)))
    })
  }, [id])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/admin/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bio: person.bio,
        bio_cs: person.bio_cs,
        photo_url: person.photo_url,
        birth_date: person.birth_date,
        death_date: person.death_date,
        nationality: person.nationality,
      }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Uloženo!' : 'Chyba.')
    setTimeout(() => setMsg(''), 3000)
  }

  async function translateBio() {
    if (!person.bio) return
    setTranslating(true)
    const res = await fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: person.bio }),
    })
    const data = await res.json()
    if (data.translated) setPerson({ ...person, bio_cs: data.translated })
    setTranslating(false)
  }

  async function syncFromTmdb() {
    setSyncing(true)
    const res = await fetch(`/api/admin/people/${id}/sync`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setPerson((prev: any) => ({
        ...prev,
        bio: data.bio ?? prev.bio,
        photo_url: data.photo_url ?? prev.photo_url,
        birth_date: data.birth_date ?? prev.birth_date,
        death_date: data.death_date ?? prev.death_date,
        nationality: data.nationality ?? prev.nationality,
      }))
      setMsg('Synchronizováno z TMDb!')
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg(data.error ?? 'Chyba při synchronizaci.')
      setTimeout(() => setMsg(''), 4000)
    }
    setSyncing(false)
  }

  async function deletePerson() {
    if (!confirm(`Smazat "${person?.name}"?`)) return
    await fetch(`/api/admin/people/${id}`, { method: 'DELETE' })
    router.push('/admin/herci')
  }

  if (!person) return <div className="text-gray-500">Načítám...</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-8">{person.name}</h1>

      <div className="flex gap-6 mb-8">
        {person.photo_url && (
          <Image src={person.photo_url} alt={person.name} width={100} height={100}
            className="rounded-full object-cover object-top flex-shrink-0" />
        )}
        <div className="flex-1 space-y-4">
          <div>
            <label className="label">Foto URL</label>
            <input value={person.photo_url ?? ''} onChange={e => setPerson({ ...person, photo_url: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Národnost / místo původu</label>
            <input value={person.nationality ?? ''} onChange={e => setPerson({ ...person, nationality: e.target.value })} className="input" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Datum narození</label>
              <input type="date" value={person.birth_date ?? ''} onChange={e => setPerson({ ...person, birth_date: e.target.value })} className="input" />
            </div>
            <div className="flex-1">
              <label className="label">Datum úmrtí</label>
              <input type="date" value={person.death_date ?? ''} onChange={e => setPerson({ ...person, death_date: e.target.value || null })} className="input" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="label">Bio (EN)</label>
          <textarea value={person.bio ?? ''} onChange={e => setPerson({ ...person, bio: e.target.value })}
            rows={5} className="input resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label !mb-0">Bio (CZ překlad)</label>
            <button
              onClick={translateBio}
              disabled={translating || !person.bio}
              className="text-xs text-accent hover:text-accent-hover disabled:opacity-40 transition-colors"
            >
              {translating ? 'Překládám...' : '✦ Přeložit z EN'}
            </button>
          </div>
          <textarea value={person.bio_cs ?? ''} onChange={e => setPerson({ ...person, bio_cs: e.target.value })}
            rows={5} className="input resize-none" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Ukládám...' : 'Uložit'}
        </button>
        <button onClick={syncFromTmdb} disabled={syncing} className="btn-secondary">
          {syncing ? 'Synchronizuji...' : '↻ Sync z TMDb'}
        </button>
        {msg && <span className="text-sm text-green-400">{msg}</span>}
        <button onClick={deletePerson} className="btn-danger ml-auto">Smazat</button>
      </div>
    </div>
  )
}
