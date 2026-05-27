import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { dbGet, dbRun } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, name } = body ?? {}

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Neplatný email.' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Heslo musí mít alespoň 8 znaků.' }, { status: 400 })
  }

  const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email])
  if (existing) {
    return NextResponse.json({ error: 'Email je již registrován.' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 12)
  await dbRun(
    'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
    [email, name?.trim() || null, password_hash]
  )

  return NextResponse.json({ ok: true })
}
