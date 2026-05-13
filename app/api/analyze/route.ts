import { NextResponse } from 'next/server'
import { readCache } from '@/lib/cache'
import { readConfig } from '@/lib/config'
import { requireApiAuth } from '@/lib/auth'
import { runAnalysisJob } from '@/lib/jobs'
import type { AnalysisResult } from '@/lib/analysis-types'

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  try {
    const body = await req.json().catch(() => ({})) as { username?: string; competitors?: string[] }
    const config = readConfig()
    const summary = await runAnalysisJob({
      username: body.username ?? config?.username,
      competitors: body.competitors ?? config?.competitors,
    })
    return NextResponse.json({ ok: true, summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[analyze]', message)
    return NextResponse.json({ error: message }, { status: message.includes('already running') ? 409 : 502 })
  }
}

export async function GET(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth
  const cached = readCache<AnalysisResult>('analysis.json')
  if (cached) return NextResponse.json(cached)
  return NextResponse.json({ error: 'No analysis yet — click Analyse' }, { status: 404 })
}
