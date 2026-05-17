'use client'

import { useState, useEffect } from 'react'

interface Franchise { id: number; name: string; description?: string }

export default function AdminFranchisePage() {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Franchise | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/franchise')
    setFranchises(await res.json())
  }

  async function create() {
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/admin/franchise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc }),
    })
    setName(''); setDesc(''); setSaving(false)
    load()
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/admin/franchise/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name, description: editing.description }),
    })
    setEditing(null); setSaving(false)
    load()
  }

  async function deleteFranchise(id: number) {
    if (!confirm('Smazat franchise?')) return
    await fetch(`/api/admin/franchise/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-8">Franchise</h1>

      {/* Create */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-8">
        <h2 className="font-semibold text-gray-200 mb-4">Nová franchise</h2>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Název" className="input" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Popis (volitelný)" className="input" />
          <button onClick={create} disabled={saving || !name.trim()} className="btn-primary">Vytvořit</button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {franchises.map(f => (
          <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            {editing?.id === f.id ? (
              <div className="space-y-3">
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input" />
                <input value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Popis" className="input" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm">Uložit</button>
                  <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Zrušit</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-100">{f.name}</p>
                  {f.description && <p className="text-gray-500 text-sm">{f.description}</p>}
                </div>
                <button onClick={() => setEditing(f)} className="text-amber-400 hover:text-amber-300 text-xs">Upravit</button>
                <button onClick={() => deleteFranchise(f.id)} className="text-red-500 hover:text-red-400 text-xs">Smazat</button>
              </div>
            )}
          </div>
        ))}
        {franchises.length === 0 && <p className="text-gray-600 text-sm">Žádné franchise.</p>}
      </div>
    </div>
  )
}
