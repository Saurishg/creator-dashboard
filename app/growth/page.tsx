export const dynamic = 'force-dynamic'

import { readCache } from '@/lib/cache'
import type { AnalysisResult } from '@/lib/analysis-types'
import type { DashboardReel } from '@/lib/transform'
import GrowthClient from './GrowthClient'

interface ProfileCache { reels: DashboardReel[]; stats: { totalReels: number; avgViews: number; engagementRate: number }; scrapedAt?: string }

export default function GrowthPage() {
  const analysis = readCache<AnalysisResult>('analysis.json')
  const profileCache = readCache<ProfileCache>('profile-reels.json')
  return <GrowthClient analysis={analysis ?? null} reels={profileCache?.reels ?? []} />
}
