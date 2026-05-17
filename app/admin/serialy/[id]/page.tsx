'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Franchise { id: number; name: string }

export default function EditShowPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [show, setShow] = useState<any>(null)
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`/api/admin/shows/${id}`).then(r => r.json()).then(setShow)
    fetch('/api/admin/franchise').then(r => r.json()).then(setFranchises)
  }, [id])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/admin/shows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: show.description,
        description_cs: show.description_cs,
        rating_imdb: show.rating_imdb ? Number(show.rating_imdb) : null,
        franchise_id: show.franchise_id ? Number(show.franchise_id) : null,
        status: show.status,
        country: show.country,
        network: show.network,
      }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Uloženo!' : 'Chyba.')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteShow() {
    if (!confirm(`Smazat "${show?.title}"?`)) return
    await fetch(`/api/admin/shows/${id}`, { method: 'DELETE' })
    router.push('/admin/serialy')
  }

  if (!show) return <div className="text-gray-500">Načítám...</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">{show.title}</h1>
        <div className="flex gap-2">
          <Link href={`/admin/serialy/${id}/herci`} className="btn-secondary text-sm">Obsazení</Link>
          <Link href={`/serialy/${show.slug}`} target="_blank" className="btn-secondary text-sm">↗ Zobrazit</Link>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="label">Popis (EN)</label>
          <textarea
            value={show.description ?? ''}
            onChange={e => setShow({ ...show, description: e.target.value })}
            rows={4} className="input resize-none"
          />
        </div>
        <div>
          <label className="label">Popis (CZ překlad)</label>
          <textarea
            value={show.description_cs ?? ''}
            onChange={e => setShow({ ...show, description_cs: e.target.value })}
            rows={4} className="input resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Franchise</label>
            <select
              value={show.franchise_id ?? ''}
              onChange={e => setShow({ ...show, franchise_id: e.target.value || null })}
              className="input"
            >
              <option value="">– Bez franchise –</option>
              {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={show.status ?? ''}
              onChange={e => setShow({ ...show, status: e.target.value })}
              className="input"
            >
              <option value="">–</option>
              <option value="Returning Series">Returning Series</option>
              <option value="Ended">Ended</option>
              <option value="Canceled">Canceled</option>
              <option value="In Production">In Production</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Země</label>
            <select
              value={show.country ?? ''}
              onChange={e => setShow({ ...show, country: e.target.value })}
              className="input"
            >
              <option value="">–</option>
              <option value="US">US</option>
              <option value="UK">UK</option>
            </select>
          </div>
          <div>
            <label className="label">Síť</label>
            <input
              value={show.network ?? ''}
              onChange={e => setShow({ ...show, network: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">IMDb rating</label>
            <input
              type="number" step="0.1" min="0" max="10"
              value={show.rating_imdb ?? ''}
              onChange={e => setShow({ ...show, rating_imdb: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Ukládám...' : 'Uložit'}
          </button>
          {msg && <span className="text-sm text-green-400">{msg}</span>}
          <button onClick={deleteShow} className="btn-danger ml-auto">Smazat</button>
        </div>
      </div>
    </div>
  )
}
