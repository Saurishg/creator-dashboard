'use client'

import { useMemo, useState } from 'react'
import Header from '@/components/dashboard/Header'
import InsightBanner from '@/components/dashboard/InsightBanner'
import PerformanceAlerts from '@/components/dashboard/PerformanceAlerts'
import QuickStats from '@/components/dashboard/QuickStats'
import CreatorScore from '@/components/dashboard/CreatorScore'
import CompetitorIntel from '@/components/dashboard/CompetitorIntel'
import NextReelIdea from '@/components/dashboard/NextReelIdea'
import TrendingAudio from '@/components/dashboard/TrendingAudio'
import RecentReels from '@/components/dashboard/RecentReels'
import DashboardFilters, { DEFAULT_FILTERS, type FilterState } from '@/components/dashboard/DashboardFilters'
import DashboardCharts from '@/components/dashboard/DashboardCharts'
import ExportButtons from '@/components/dashboard/ExportButtons'
import LiveRefreshBar from '@/components/dashboard/LiveRefreshBar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useLiveRefresh } from '@/hooks/useLiveRefresh'
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs'
import type { DashboardReel, DashboardCompetitor, DashboardStats, DashboardAudio } from '@/lib/transform'
import type { AnalysisResult } from '@/lib/analysis-types'

interface Props {
  username?: string
  reels: DashboardReel[]
  stats: DashboardStats | null
  competitors: DashboardCompetitor[]
  trendingAudio: DashboardAudio[]
  analysis: AnalysisResult | null
}

const RANGE_DAYS: Record<FilterState['range'], number | null> = {
  '7d':  7,
  '30d': 30,
  '90d': 90,
  'all': null,
}

function applyFilters(all: DashboardReel[], filters: FilterState): DashboardReel[] {
  const cutoffDays = RANGE_DAYS[filters.range]
  const cutoff = cutoffDays ? Date.now() - cutoffDays * 86_400_000 : null
  const q = filters.query.trim().toLowerCase()

  let out = all.filter((r) => {
    if (filters.type !== 'All' && r.type !== filters.type) return false
    if (cutoff && r.dateIso) {
      const t = new Date(r.dateIso).getTime()
      if (Number.isFinite(t) && t < cutoff) return false
    }
    if (q && !r.title.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false
    return true
  })

  if (filters.sort === 'views') {
    out = [...out].sort((a, b) => b.viewsRaw - a.viewsRaw)
  } else if (filters.sort === 'engagement') {
    const eng = (r: DashboardReel) => r.viewsRaw > 0 ? (r.likesRaw + r.commentsRaw) / r.viewsRaw : 0
    out = [...out].sort((a, b) => eng(b) - eng(a))
  } else {
    out = [...out].sort((a, b) => {
      const at = a.dateIso ? new Date(a.dateIso).getTime() : 0
      const bt = b.dateIso ? new Date(b.dateIso).getTime() : 0
      return bt - at
    })
  }

  return out
}

function searchAcross(query: string, comps: DashboardCompetitor[], audio: DashboardAudio[]): { competitors: DashboardCompetitor[]; audio: DashboardAudio[] } {
  const q = query.trim().toLowerCase()
  if (!q) return { competitors: comps, audio }
  return {
    competitors: comps.filter((c) => c.handle.toLowerCase().includes(q)),
    audio:       audio.filter((a) => a.name.toLowerCase().includes(q)),
  }
}

export default function DashboardShell({ username, reels, stats, competitors, trendingAudio, analysis }: Props) {
  const isMobile = useIsMobile()
  const { prefs } = useDashboardPrefs()

  const live = useLiveRefresh({
    enabled:     prefs.liveRefresh,
    intervalSec: prefs.pollingInterval,
    initial: {
      username:      username ?? null,
      reels,
      stats,
      competitors,
      trendingAudio,
      analysis,
      scrapedAt:     null,
      fetchedAt:     null,
    },
  })

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const filteredReels = useMemo(() => applyFilters(live.reels, filters), [live.reels, filters])
  const filteredCompetitorsAndAudio = useMemo(
    () => searchAcross(filters.query, live.competitors, live.trendingAudio),
    [filters.query, live.competitors, live.trendingAudio],
  )

  return (
    <>
      <Header username={live.username ?? username} analysedAt={live.analysis?.analysedAt ?? analysis?.analysedAt} />

      <LiveRefreshBar
        loading={live.loading}
        error={live.error}
        lastFetchedAt={live.lastFetchedAt}
        onRefresh={live.refresh}
        rightSlot={<ExportButtons reels={filteredReels} username={live.username ?? username} />}
      />

      <DashboardFilters
        filters={filters}
        onChange={setFilters}
        totalCount={live.reels.length}
        visibleCount={filteredReels.length}
      />

      <InsightBanner analysis={live.analysis ?? analysis} />
      <PerformanceAlerts reels={filteredReels} />
      <QuickStats liveStats={live.stats ?? stats ?? undefined} />

      <DashboardCharts reels={filteredReels} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: 20, marginBottom: 20 }}>
        <CreatorScore analysis={live.analysis ?? analysis} stats={live.stats ?? stats} />
        <CompetitorIntel competitors={filteredCompetitorsAndAudio.competitors} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 20, marginBottom: 20 }}>
        <NextReelIdea analysis={live.analysis ?? analysis} />
        <TrendingAudio tracks={filteredCompetitorsAndAudio.audio} />
      </div>

      <RecentReels reels={filteredReels} />
    </>
  )
}
