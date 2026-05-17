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
        nationality: person.nationality,
      }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Uloženo!' : 'Chyba.')
    setTimeout(() => setMsg(''), 3000)
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
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="label">Bio (EN)</label>
          <textarea value={person.bio ?? ''} onChange={e => setPerson({ ...person, bio: e.target.value })}
            rows={5} className="input resize-none" />
        </div>
        <div>
          <label className="label">Bio (CZ překlad)</label>
          <textarea value={person.bio_cs ?? ''} onChange={e => setPerson({ ...person, bio_cs: e.target.value })}
            rows={5} className="input resize-none" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Ukládám...' : 'Uložit'}
        </button>
        {msg && <span className="text-sm text-green-400">{msg}</span>}
        <button onClick={deletePerson} className="btn-danger ml-auto">Smazat</button>
      </div>
    </div>
  )
}
