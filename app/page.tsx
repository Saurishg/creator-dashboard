export const dynamic = 'force-dynamic'

import { readConfig } from '@/lib/config'
import { readCache } from '@/lib/cache'
import DashboardShell from '@/components/DashboardShell'
import type { DashboardReel, DashboardCompetitor, DashboardStats, DashboardAudio } from '@/lib/transform'
import type { AnalysisResult } from '@/lib/analysis-types'

interface ProfileCache { reels: DashboardReel[]; stats: DashboardStats }
interface CompetitorCache { competitors: DashboardCompetitor[]; trendingAudio: DashboardAudio[] }

export default function Page() {
  const config = readConfig()

  const profileCache  = readCache<ProfileCache>('profile-reels.json')
  const compCache     = readCache<CompetitorCache>('competitor-intel.json')
  const analysisCache = readCache<AnalysisResult>('analysis.json')

  return (
    <DashboardShell
      username={config?.username}
      reels={profileCache?.reels ?? []}
      stats={profileCache?.stats ?? null}
      competitors={compCache?.competitors ?? []}
      trendingAudio={compCache?.trendingAudio ?? []}
      analysis={analysisCache ?? null}
    />
  )
}
