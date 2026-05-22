export const dynamic = 'force-dynamic'

import { getOpenAI, LOCAL_MODEL } from '@/lib/openai-client'
import { readCache } from '@/lib/cache'
import { readCreatorProfile } from '@/lib/creator-profile'
import { requireApiAuth } from '@/lib/auth'
import type { AnalysisResult, CompetitorAnalysisResult } from '@/lib/analysis-types'

interface ProfileCache {
  reels: { title: string; views: string; viewsRaw: number; likes: string; comments: string; type: string; date: string; url: string }[]
  stats: { totalReels: number; avgViews: number; engagementRate: number }
  scrapedAt?: string
}

interface CalendarCache {
  generatedAt: string
  posts: { day: number; date: string; hookType: string; hook: string; topic: string; cta: string }[]
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function buildSystemPrompt(): string {
  const profile   = readCreatorProfile()
  const profileCache  = readCache<ProfileCache>('profile-reels.json')
  const analysis  = readCache<AnalysisResult>('analysis.json')
  const compAnalysis = readCache<CompetitorAnalysisResult>('competitor-analysis.json')
  const calendar  = readCache<CalendarCache>('calendar.json')

  const reels  = profileCache?.reels ?? []
  const stats  = profileCache?.stats
  const p      = analysis?.patterns

  const lines: string[] = []

  lines.push(`You are CreatorOS AI — an expert Instagram Reels strategist built into this creator's analytics dashboard.`)
  lines.push(`Answer concisely and specifically. Use the data below to give actionable, personalised advice. When you reference a reel, cite its hook or topic. Always end with one clear next action.`)
  lines.push(`Today's date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`)
  lines.push(``)

  lines.push(`== CREATOR PROFILE ==`)
  lines.push(`Instagram: @${profile.username}`)
  lines.push(`Display name: ${profile.displayName}`)
  lines.push(`Niche: ${profile.contentNiche}`)
  lines.push(`Audience: ${profile.audience}`)
  lines.push(`Language style: ${profile.languageStyle}`)
  lines.push(``)

  if (stats) {
    lines.push(`== PERFORMANCE OVERVIEW ==`)
    lines.push(`Total reels tracked: ${stats.totalReels}`)
    lines.push(`Average views per reel: ${fmt(stats.avgViews)}`)
    lines.push(`Engagement rate: ${stats.engagementRate}%`)
    if (profileCache?.scrapedAt) lines.push(`Last scraped: ${new Date(profileCache.scrapedAt).toLocaleString()}`)
    lines.push(``)
  }

  if (reels.length > 0) {
    const top = [...reels].sort((a, b) => b.viewsRaw - a.viewsRaw).slice(0, 5)
    lines.push(`== TOP 5 REELS (by views) ==`)
    top.forEach((r, i) => {
      lines.push(`${i + 1}. "${r.title}" — ${r.views} views · ${r.likes} likes · ${r.comments} comments · ${r.date}`)
    })
    lines.push(``)

    const bottom = [...reels].sort((a, b) => a.viewsRaw - b.viewsRaw).slice(0, 3)
    lines.push(`== LOWEST PERFORMING REELS ==`)
    bottom.forEach((r, i) => {
      lines.push(`${i + 1}. "${r.title}" — ${r.views} views · ${r.date}`)
    })
    lines.push(``)

    const typeMap: Record<string, { views: number; count: number }> = {}
    reels.forEach((r) => {
      if (!typeMap[r.type]) typeMap[r.type] = { views: 0, count: 0 }
      typeMap[r.type].views += r.viewsRaw
      typeMap[r.type].count++
    })
    lines.push(`== PERFORMANCE BY CONTENT TYPE ==`)
    Object.entries(typeMap)
      .sort((a, b) => b[1].views / b[1].count - a[1].views / a[1].count)
      .forEach(([type, { views, count }]) => {
        lines.push(`${type}: ${count} reels · avg ${fmt(Math.round(views / count))} views`)
      })
    lines.push(``)
  }

  if (p) {
    lines.push(`== YOUR WINNING FORMULA ==`)
    lines.push(p.winningFormula)
    lines.push(``)

    lines.push(`== TOP HOOK TYPES (ranked by performance) ==`)
    p.topHookTypes.forEach((h, i) => {
      const eng = p.avgEngagementByHookType?.[h]
      lines.push(`${i + 1}. ${h}${eng !== undefined ? ` — ${eng.toFixed(1)}% engagement` : ''}`)
    })
    lines.push(``)

    lines.push(`== TOP CTA FORMATS ==`)
    p.topCTAFormats.slice(0, 5).forEach((c) => lines.push(`• ${c}`))
    lines.push(``)

    lines.push(`== COMMON BODY STRUCTURE ==`)
    lines.push(p.commonBodyStructure)
    lines.push(``)

    lines.push(`== BEST PERFORMING PATTERN ==`)
    lines.push(p.bestPerformingPattern)
    lines.push(``)

    lines.push(`== CONTENT WEAKNESSES / GAPS ==`)
    p.weaknesses.forEach((w) => lines.push(`• ${w}`))
    lines.push(``)

    lines.push(`== AI RECOMMENDATIONS ==`)
    p.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`))
    lines.push(``)
  }

  if (analysis?.breakdowns?.length) {
    const topBreakdowns = [...analysis.breakdowns]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
    lines.push(`== TOP REEL BREAKDOWNS ==`)
    topBreakdowns.forEach((r, i) => {
      lines.push(`${i + 1}. ${fmt(r.views)} views | Hook type: ${r.hookType} | Trigger: ${r.emotionalTrigger}`)
      lines.push(`   Hook: "${r.hook}"`)
      lines.push(`   Body: ${r.body}`)
      lines.push(`   CTA: ${r.cta}`)
    })
    lines.push(``)
  }

  if (compAnalysis?.competitors?.length) {
    lines.push(`== COMPETITOR INSIGHTS ==`)
    compAnalysis.competitors.forEach((comp) => {
      lines.push(`@${comp.handle} (${comp.totalReels} reels analysed):`)
      lines.push(`  Winning formula: ${comp.patterns.winningFormula}`)
      lines.push(`  Top hooks: ${comp.patterns.topHookTypes?.slice(0, 3).join(', ')}`)
      lines.push(`  Top CTAs: ${comp.patterns.topCTAFormats?.slice(0, 2).join(', ')}`)
    })
    lines.push(``)
  }

  if (calendar?.posts?.length) {
    const upcoming = calendar.posts.slice(0, 7)
    lines.push(`== NEXT 7 CONTENT CALENDAR POSTS ==`)
    upcoming.forEach((post) => {
      lines.push(`Day ${post.day} (${post.date}): [${post.hookType}] "${post.hook}" | Topic: ${post.topic} | CTA: ${post.cta}`)
    })
    lines.push(``)
  }

  return lines.join('\n')
}

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const body = await req.json().catch(() => ({})) as { messages?: { role: string; content: string }[] }
  const messages = body.messages ?? []

  if (!messages.length) {
    return new Response(JSON.stringify({ error: 'No messages' }), { status: 400 })
  }

  const systemPrompt = buildSystemPrompt()
  const openai = getOpenAI()

  try {
    const stream = await openai.chat.completions.create({
      model: LOCAL_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      stream: true,
      temperature: 0.65,
      max_tokens: 800,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
        } catch { /* stream ended */ }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI error'
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
