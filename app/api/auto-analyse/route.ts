import { NextResponse } from 'next/server'
import { readCache } from '@/lib/cache'
import { runAnalysisJob } from '@/lib/jobs'
import { requireApiAuth } from '@/lib/auth'
import type { AnalysisResult } from '@/lib/analysis-types'

// Auto re-analyse: only runs if last analysis is older than 6 hours
export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const cached = readCache<AnalysisResult>('analysis.json')
  if (cached?.analysedAt) {
    const ageHours = (Date.now() - new Date(cached.analysedAt).getTime()) / 3600000
    if (ageHours < 6) {
      return NextResponse.json({ skipped: true, reason: `Last analysis ${ageHours.toFixed(1)}h ago — too recent` })
    }
  }

  try {
    const summary = await runAnalysisJob()
    return NextResponse.json({ ok: true, summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
