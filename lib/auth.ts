import { NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'

function safeEqual(a: string, b: string): boolean {
  // Hash both to equal length before comparing to avoid length leaks
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function requireApiAuth(req: Request): NextResponse | null {
  const token = process.env.API_AUTH_TOKEN?.trim()
  // Treat missing or placeholder token as auth disabled (dev mode)
  if (!token || token === 'change_me_for_production') return null

  const header = req.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const apiToken = req.headers.get('x-api-token')?.trim() ?? ''

  if ((bearer && safeEqual(bearer, token)) || (apiToken && safeEqual(apiToken, token))) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
