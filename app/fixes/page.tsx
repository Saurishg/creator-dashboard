export const dynamic = 'force-dynamic'

import { readCache } from '@/lib/cache'
import type { AnalysisResult, CompetitorAnalysisResult } from '@/lib/analysis-types'
import FixesClient from './FixesClient'

export type Severity = 'critical' | 'medium' | 'low'

export interface StrategicFix {
  id: string
  severity: Severity
  title: string
  detail: string
  evidence?: string
  source: 'weakness' | 'recommendation' | 'competitor-gap'
}

export interface PostFix {
  id: string
  url: string
  reason: string
  hook: string | null
  caption: string
  views: number
  likes: number
  comments: number
  engagementScore: number
  severity: Severity
}

interface Bundle {
  strategic: StrategicFix[]
  posts: PostFix[]
  analysedAt: string | null
  totalReels: number
  competitorHandles: string[]
}

function buildFixes(
  analysis: AnalysisResult | null,
  comp: CompetitorAnalysisResult | null,
): Bundle {
  if (!analysis) {
    return { strategic: [], posts: [], analysedAt: null, totalReels: 0, competitorHandles: [] }
  }

  const p = analysis.patterns
  const strategic: StrategicFix[] = []

  // 1. Weaknesses — critical, surfaced from AI analysis of your own content
  for (const [i, w] of (p.weaknesses ?? []).entries()) {
    strategic.push({
      id: `weak-${i}`,
      severity: 'critical',
      title: w,
      detail: `Pattern detected across ${analysis.totalReels} of your posts.`,
      source: 'weakness',
    })
  }

  // 2. Own-account recommendations — medium priority improvements
  for (const [i, r] of (p.recommendations ?? []).entries()) {
    strategic.push({
      id: `rec-${i}`,
      severity: 'medium',
      title: r,
      detail: p.winningFormula
        ? `Your winning formula: ${p.winningFormula}`
        : '',
      source: 'recommendation',
    })
  }

  // 3. Competitor gaps — things they do that you don't
  const ownHookTypes = new Set(p.topHookTypes ?? [])
  for (const c of comp?.competitors ?? []) {
    const cp = c.patterns
    const compHooks = cp.topHookTypes ?? []
    const missing = compHooks.filter((t) => !ownHookTypes.has(t))
    if (missing.length) {
      strategic.push({
        id: `comp-${c.handle}-hooks`,
        severity: 'low',
        title: `Try '${missing[0]}' hook — @${c.handle} uses it heavily, you don't`,
        detail: cp.winningFormula
          ? `Their winning formula: ${cp.winningFormula}`
          : '',
        evidence: `@${c.handle} (${c.totalReels} reels analysed)`,
        source: 'competitor-gap',
      })
    }
    // Pull the first 1-2 competitor recs as gap suggestions
    for (const [i, rec] of (cp.recommendations ?? []).slice(0, 2).entries()) {
      strategic.push({
        id: `comp-${c.handle}-rec-${i}`,
        severity: 'low',
        title: rec,
        detail: '',
        evidence: `From @${c.handle} content analysis`,
        source: 'competitor-gap',
      })
    }
  }

  // 4. Per-post fixes — specific reels with issues
  const posts: PostFix[] = []
  const breakdowns = analysis.breakdowns ?? []
  const videoReels = breakdowns.filter((b) => (b.views ?? 0) > 0)
  const medianEng = videoReels.length
    ? [...videoReels].sort((a, b) => a.engagementScore - b.engagementScore)[
        Math.floor(videoReels.length / 2)
      ]?.engagementScore ?? 0
    : 0

  for (const b of breakdowns) {
    const issues: string[] = []
    const cap = (b.caption ?? '').trim()
    const hookText = (b.hook ?? '').trim()
    const ctaText = (b.cta ?? '').trim()

    if (!cap) issues.push('No caption')
    if (!hookText || hookText.length < 6) issues.push('Weak / missing hook')
    if (!ctaText || ctaText.length < 4) issues.push('No clear CTA')
    if ((b.views ?? 0) > 0 && b.engagementScore < medianEng * 0.4) {
      issues.push(`Engagement ${b.engagementScore.toFixed(1)}% vs median ${medianEng.toFixed(1)}%`)
    }
    if (cap.length > 1500) issues.push('Caption too long (>1500 chars)')

    if (issues.length === 0) continue

    posts.push({
      id: b.reelId,
      url: b.url,
      reason: issues.join(' · '),
      hook: hookText || null,
      caption: cap.slice(0, 140),
      views: b.views ?? 0,
      likes: b.likes ?? 0,
      comments: b.comments ?? 0,
      engagementScore: b.engagementScore,
      severity: issues.length >= 3 ? 'critical' : issues.length === 2 ? 'medium' : 'low',
    })
  }

  // Sort by severity (critical first) then by views (high-traffic posts first)
  const severityOrder: Record<Severity, number> = { critical: 0, medium: 1, low: 2 }
  posts.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      (b.views ?? 0) - (a.views ?? 0),
  )

  return {
    strategic,
    posts: posts.slice(0, 50), // cap at 50 most actionable
    analysedAt: analysis.analysedAt,
    totalReels: analysis.totalReels,
    competitorHandles: (comp?.competitors ?? []).map((c) => c.handle),
  }
}

export default function FixesPage() {
  const analysis = readCache<AnalysisResult>('analysis.json')
  const comp     = readCache<CompetitorAnalysisResult>('competitor-analysis.json')
  const bundle   = buildFixes(analysis, comp)

  return <FixesClient {...bundle} />
}
