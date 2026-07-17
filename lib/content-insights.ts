import type { AnalysisResult } from './analysis-types'
import type { DashboardReel } from './transform'

export interface HookEvidence {
  label: string
  samples: number
  medianViews: number
  engagementRate: number
}

export interface ContentInsights {
  totalPosts: number
  measuredPosts: number
  coveragePct: number
  averageViews: number
  medianViews: number
  highPerformers: number
  hookEvidence: HookEvidence | null
  engagementHook: HookEvidence | null
  underperformingHook: HookEvidence | null
  missingViews: number
  missingHooks: number
  recommendation: string
  qualityNote: string
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

function engagementRate(reels: DashboardReel[]): number {
  const views = reels.reduce((sum, reel) => sum + reel.viewsRaw, 0)
  if (!views) return 0
  const interactions = reels.reduce((sum, reel) => sum + reel.likesRaw + reel.commentsRaw, 0)
  return Number(((interactions / views) * 100).toFixed(1))
}

function normalizeHookType(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (normalized.startsWith('call') && normalized.includes('action')) return 'Call to action'
  if (normalized.startsWith('warning')) return 'Warning'
  if (normalized === 'storytelling') return 'Story opener'
  return value.trim()
}

export function buildContentInsights(reels: DashboardReel[], analysis: AnalysisResult | null): ContentInsights {
  const measured = reels.filter((reel) => reel.viewsRaw > 0)
  const totalViews = measured.reduce((sum, reel) => sum + reel.viewsRaw, 0)
  const averageViews = measured.length ? Math.round(totalViews / measured.length) : 0
  const medianViews = median(measured.map((reel) => reel.viewsRaw))
  const coveragePct = reels.length ? Math.round((measured.length / reels.length) * 100) : 0
  const highPerformers = measured.filter((reel) => reel.viewsRaw >= Math.max(medianViews * 2, 1)).length

  const reelById = new Map(reels.map((reel) => [reel.id, reel]))
  const hooks = new Map<string, DashboardReel[]>()
  for (const breakdown of analysis?.breakdowns ?? []) {
    const reel = reelById.get(breakdown.reelId)
    if (!reel || reel.viewsRaw === 0 || !breakdown.hookType || breakdown.hookType === 'Other') continue
    const hookType = normalizeHookType(breakdown.hookType)
    const group = hooks.get(hookType) ?? []
    group.push(reel)
    hooks.set(hookType, group)
  }

  const hookEvidenceList = [...hooks.entries()]
    .filter(([, group]) => group.length >= 5)
    .map(([label, group]) => ({
      label,
      samples: group.length,
      medianViews: median(group.map((reel) => reel.viewsRaw)),
      engagementRate: engagementRate(group),
    }))
  const hookEvidence = [...hookEvidenceList]
    .sort((a, b) => b.medianViews - a.medianViews || b.engagementRate - a.engagementRate)[0] ?? null
  const engagementHook = hookEvidenceList
    .filter((hook) => hook.samples >= 10)
    .sort((a, b) => b.engagementRate - a.engagementRate || b.medianViews - a.medianViews)[0] ?? null
  const underperformingHook = [...hookEvidenceList]
    .filter((hook) => hook.samples >= 10 && hook.engagementRate < engagementRate(measured))
    .sort((a, b) => b.samples - a.samples || a.engagementRate - b.engagementRate)[0] ?? null

  const recommendation = hookEvidence
    ? `Test another ${hookEvidence.label.toLowerCase()} opening. It has the strongest median reach in ${hookEvidence.samples} measured posts.`
    : measured.length
      ? 'Use a clear first-line promise and one specific call to action, then compare it against the median view baseline.'
      : 'Run a fresh scrape with reel view counts enabled before making performance decisions.'

  const qualityNote = coveragePct < 70
    ? `View counts are available for ${coveragePct}% of the selected posts. Treat reach comparisons as directional until the next scrape fills the gaps.`
    : `View counts cover ${coveragePct}% of the selected posts, which is sufficient for directional content decisions.`

  return {
    totalPosts: reels.length,
    measuredPosts: measured.length,
    coveragePct,
    averageViews,
    medianViews,
    highPerformers,
    hookEvidence,
    engagementHook,
    underperformingHook,
    missingViews: reels.length - measured.length,
    missingHooks: (analysis?.breakdowns ?? []).filter((breakdown) => !breakdown.hook).length,
    recommendation,
    qualityNote,
  }
}
