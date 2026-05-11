import { NextResponse } from 'next/server'

export function requireApiAuth(req: Request): NextResponse | null {
  const token = process.env.API_AUTH_TOKEN?.trim()
  if (!token) return null

  const header = req.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const apiToken = req.headers.get('x-api-token')?.trim() ?? ''

  if (bearer === token || apiToken === token) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
