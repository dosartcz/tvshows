import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Jsi redaktor českého seriálového webu. Přelož popis seriálu do češtiny.

Pravidla:
- Piš přirozenou, moderní češtinou — jako by byl popis napsaný česky od začátku
- Zachovej jména postav, seriálů a herců v originále
- Odborné termíny překládej přesně (vigilantes = zákon do vlastních rukou / samozvaní ochránci, superhero = superhrdina, atd.)
- Vyhýbej se doslovným překladům, které znějí divně ("nadšenci" místo vigilantes apod.)
- Vrať pouze přeložený text, bez uvozovek, bez komentářů

${text}`,
      }],
    }),
  })

  const data = await res.json()
  const translated = data?.content?.[0]?.text ?? ''
  return NextResponse.json({ translated })
}
