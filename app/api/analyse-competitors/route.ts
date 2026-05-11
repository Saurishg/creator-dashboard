import { NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'
import { scrapeTranscribeAnalyseCompetitors } from '@/lib/pipeline'
import { requireApiAuth } from '@/lib/auth'
import { withJobLock } from '@/lib/jobs'

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const config = readConfig()
  const handles = config?.competitors ?? (process.env.COMPETITOR_HANDLES ?? '').split(',').map((h) => h.trim()).filter(Boolean)

  if (!handles.length) {
    return NextResponse.json({ error: 'No competitor handles configured' }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  function send(data: object) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      const result = await withJobLock(
        'competitor-analysis',
        () => scrapeTranscribeAnalyseCompetitors(
          handles,
          (msg, pct) => send({ step: msg, progress: pct }),
        ),
      )
      send({
        step: 'Done!',
        progress: 100,
        done: true,
        summary: { competitors: result.competitors.length, totalReels: result.competitors.reduce((s, c) => s + c.totalReels, 0) },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      send({ error: message, done: true })
    } finally {
      writer.close()
    }
  })()

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
