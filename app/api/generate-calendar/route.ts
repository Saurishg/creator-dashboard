export const dynamic = 'force-dynamic'

import { getOpenAI, LOCAL_MODEL } from '@/lib/openai-client'
import { readCache, writeCache } from '@/lib/cache'
import type { AnalysisResult, CompetitorAnalysisResult } from '@/lib/analysis-types'
import { creatorHandle, readCreatorProfile } from '@/lib/creator-profile'
import { parseJsonArray } from '@/lib/json'
import { requireApiAuth } from '@/lib/auth'

export interface GeneratedPost {
  day: number
  date: string
  weekday: string
  hookType: string
  hook: string
  body: string
  cta: string
  topic: string
  whyItWorks: string
  color: string
  emoji: string
}

export interface GeneratedCalendar {
  generatedAt: string
  posts: GeneratedPost[]
  totalPosts: number
}

const HOOK_COLORS: Record<string, string> = {
  'Bold claim': '#6366f1', 'Shocking number': '#f59e0b', 'Question': '#06b6d4',
  'Story opener': '#10b981', "Warning/Don't": '#ef4444', 'Contrarian': '#8b5cf6',
  'Social proof': '#ec4899', 'Future promise': '#14b8a6',
}
const HOOK_EMOJIS: Record<string, string> = {
  'Bold claim': '⚡', 'Shocking number': '🔢', 'Question': '❓',
  'Story opener': '📖', "Warning/Don't": '⚠️', 'Contrarian': '🔥',
  'Social proof': '🏆', 'Future promise': '🚀',
}
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const POSTING_DAYS = [1, 2, 4, 6, 0] // Mon Tue Thu Sat Sun

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const openai = getOpenAI()

  const analysis = readCache<AnalysisResult>('analysis.json')
  if (!analysis) return new Response(JSON.stringify({ error: 'No analysis found — run Re-analyse first' }), { status: 400 })

  const compAnalysis = readCache<CompetitorAnalysisResult>('competitor-analysis.json')
  const profile = readCreatorProfile()
  const handle = creatorHandle(profile)

  // Build posting schedule for next 30 days
  const schedule: { day: number; date: string; weekday: string }[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < 30; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    if (POSTING_DAYS.includes(d.getDay())) {
      schedule.push({ day: i + 1, date: d.toISOString().split('T')[0], weekday: WEEKDAYS[d.getDay()] })
    }
  }

  // Build context for local model
  const p = analysis.patterns
  const ownBreakdowns = analysis.breakdowns.slice(0, 10).map((b) =>
    `Hook: "${b.hook}" | Type: ${b.hookType} | Views: ${b.views.toLocaleString()} | CTA: "${b.cta}"`
  ).join('\n')

  const compContext = compAnalysis?.competitors?.map((c) => {
    const topReels = [...c.breakdowns].sort((a, b) => b.views - a.views).slice(0, 3)
      .map((r) => `  Hook: "${r.hook}" (${r.views.toLocaleString()} views, ${r.hookType})`)
      .join('\n')
    return `@${c.handle} — Winning formula: ${c.patterns.winningFormula}\nTop reels:\n${topReels}`
  }).join('\n\n') ?? 'No competitor analysis yet'

  const prompt = `You are a viral Instagram Reels content strategist for ${handle}.

Creator profile:
- Display name: ${profile.displayName}
- Niche: ${profile.contentNiche}
- Audience: ${profile.audience}
- Language/style: ${profile.languageStyle}
- Calendar focus: ${profile.calendarFocus}

## Your Winning Pattern (from analysis of ${analysis.totalReels} reels)
- Winning formula: ${p.winningFormula}
- Best performing hook types: ${p.topHookTypes.join(', ')}
- Best CTAs: ${p.topCTAFormats.join(', ')}
- Body structure: ${p.commonBodyStructure}
- Engagement by hook type: ${JSON.stringify(p.avgEngagementByHookType)}

## Their Real Past Hooks (DO NOT reuse these — use them only to understand their style):
${ownBreakdowns}

## What Competitors Are Doing That Works:
${compContext}

## Weaknesses to Fix:
${p.weaknesses.join('\n')}

## Your Task
Generate ${schedule.length} ORIGINAL Instagram Reel ideas for a 30-day content calendar. Each idea must be:
1. A BRAND NEW topic — never posted before
2. About ${profile.calendarFocus}
3. Written in their style (${profile.languageStyle})
4. Following his winning formula but varying hook types intelligently
5. Fixing his weaknesses (add emotional storytelling, shocking numbers, personal anecdotes)

The schedule has ${schedule.length} posting slots. Return exactly ${schedule.length} posts.

Return ONLY valid JSON array (no markdown, no explanation):
[
  {
    "slotIndex": 0,
    "hookType": "Bold claim",
    "hook": "exact opening line the creator should say, very specific",
    "body": "3-step body outline: what to show/say in the middle of the reel",
    "cta": "exact CTA text",
    "topic": "2-4 word topic label",
    "whyItWorks": "one sentence explaining why this specific idea will get views"
  }
]`

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  function send(data: object) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      send({ step: `Sending your analysis to ${LOCAL_MODEL}…`, progress: 10 })

      const completion = await openai.chat.completions.create({
        model: LOCAL_MODEL,
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      })

      send({ step: 'Parsing calendar ideas…', progress: 80 })

      const raw = completion.choices[0]?.message?.content ?? ''
      const ideas = parseJsonArray<{ slotIndex: number; hookType: string; hook: string; body: string; cta: string; topic: string; whyItWorks: string }>(raw)
      if (ideas.length === 0) throw new Error('Model returned no usable calendar ideas')

      const posts: GeneratedPost[] = schedule.map((slot, i) => {
        const idea = ideas[i] ?? ideas[i % ideas.length]
        return {
          day: slot.day,
          date: slot.date,
          weekday: slot.weekday,
          hookType: idea.hookType,
          hook: idea.hook,
          body: idea.body,
          cta: idea.cta,
          topic: idea.topic,
          whyItWorks: idea.whyItWorks,
          color: HOOK_COLORS[idea.hookType] ?? '#6366f1',
          emoji: HOOK_EMOJIS[idea.hookType] ?? '⚡',
        }
      })

      const calendar: GeneratedCalendar = {
        generatedAt: new Date().toISOString(),
        posts,
        totalPosts: posts.length,
      }
      writeCache('calendar.json', calendar)

      send({ step: 'Calendar ready!', progress: 100, done: true, totalPosts: posts.length })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      send({ error: msg, done: true })
    } finally {
      writer.close()
    }
  })()

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
