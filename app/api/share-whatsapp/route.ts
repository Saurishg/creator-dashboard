import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth'

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const { phone, message } = (await req.json()) as { phone?: string; message?: string }
  const target = phone?.trim() || process.env.WHATSAPP_NUMBER?.trim()
  if (!target) return NextResponse.json({ error: 'No phone number configured' }, { status: 400 })

  const url = process.env.CREATOR_DASHBOARD_URL || 'http://127.0.0.1:3000'
  const text = message?.trim() || `📊 Creator Dashboard\n${url}`
  const waUrl = `${process.env.WA_SERVICE_URL || 'http://127.0.0.1:3131'}/send`

  try {
    const res = await fetch(waUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: target, message: text }),
      signal: AbortSignal.timeout(30_000),
    })
    const body = await res.json()
    if (!body.ok) return NextResponse.json({ error: body.error || 'wa-service error' }, { status: 502 })
    return NextResponse.json({ ok: true, phone: target })
  } catch (e) {
    return NextResponse.json({ error: `wa-service unreachable: ${(e as Error).message}` }, { status: 502 })
  }
}
