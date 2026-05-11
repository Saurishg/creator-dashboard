import { NextResponse } from 'next/server'
import { writeConfig } from '@/lib/config'
import { runAnalysisJob } from '@/lib/jobs'
import { requireApiAuth } from '@/lib/auth'

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const body = await req.json().catch(() => null) as { username: string; competitors: string[] } | null
  if (!body?.username) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const { username, competitors } = body
  const cleanUsername = username.replace(/^@/, '').trim()
  const cleanCompetitors = competitors.map((h) => h.replace(/^@/, '').trim()).filter(Boolean)

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  function send(data: object) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      // 1. Save config
      send({ step: 'Saving your configuration…', progress: 3 })
      writeConfig(cleanUsername, cleanCompetitors)
      const summary = await runAnalysisJob(
        { username: cleanUsername, competitors: cleanCompetitors },
        ({ step, progress }) => send({ step, progress }),
      )

      // 5. Done
      send({
        step: 'Your dashboard is ready!',
        progress: 100,
        done: true,
        summary,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[setup]', message)
      send({ error: message, done: true })
    } finally {
      writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
