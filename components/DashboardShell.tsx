'use client'

import Header from '@/components/dashboard/Header'
import InsightBanner from '@/components/dashboard/InsightBanner'
import QuickStats from '@/components/dashboard/QuickStats'
import CreatorScore from '@/components/dashboard/CreatorScore'
import CompetitorIntel from '@/components/dashboard/CompetitorIntel'
import NextReelIdea from '@/components/dashboard/NextReelIdea'
import TrendingAudio from '@/components/dashboard/TrendingAudio'
import RecentReels from '@/components/dashboard/RecentReels'
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

export default function DashboardShell({ username, reels, stats, competitors, trendingAudio, analysis }: Props) {
  return (
    <>
      <Header username={username} analysedAt={analysis?.analysedAt} />
      <InsightBanner analysis={analysis} />
      <QuickStats liveStats={stats ?? undefined} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 20 }}>
        <CreatorScore />
        <CompetitorIntel competitors={competitors} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, marginBottom: 20 }}>
        <NextReelIdea analysis={analysis} />
        <TrendingAudio tracks={trendingAudio} />
      </div>

      <RecentReels reels={reels} />
    </>
  )
}
