import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { dbGet, dbRun } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action, name, currentPassword, newPassword } = body ?? {}

  if (action === 'update_name') {
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Neplatné jméno.' }, { status: 400 })
    }
    await dbRun('UPDATE users SET name = ? WHERE email = ?', [name.trim(), session.user.email])
    return NextResponse.json({ ok: true })
  }

  if (action === 'update_password') {
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Nové heslo musí mít alespoň 8 znaků.' }, { status: 400 })
    }
    const user = await dbGet<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE email = ?',
      [session.user.email]
    )
    if (user?.password_hash) {
      if (!currentPassword) return NextResponse.json({ error: 'Zadejte aktuální heslo.' }, { status: 400 })
      const valid = await bcrypt.compare(currentPassword, user.password_hash)
      if (!valid) return NextResponse.json({ error: 'Nesprávné aktuální heslo.' }, { status: 400 })
    }
    const hash = await bcrypt.hash(newPassword, 12)
    await dbRun('UPDATE users SET password_hash = ? WHERE email = ?', [hash, session.user.email])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Neznámá akce.' }, { status: 400 })
}
