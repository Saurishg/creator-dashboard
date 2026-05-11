export const dynamic = 'force-dynamic'

import { readCache } from '@/lib/cache'
import { competitors as dummyCompetitors } from '@/lib/dummy-data'
import type { DashboardCompetitor } from '@/lib/transform'
import type { CompetitorAnalysisResult } from '@/lib/analysis-types'
import CompetitorsClient from './CompetitorsClient'

interface CompetitorCache { competitors: DashboardCompetitor[] }

export default function CompetitorsPage() {
  const cache = readCache<CompetitorCache>('competitor-intel.json')
  const compAnalysis = readCache<CompetitorAnalysisResult>('competitor-analysis.json')
  const competitors = cache?.competitors?.length ? cache.competitors : (dummyCompetitors as DashboardCompetitor[])
  const isLive = !!cache?.competitors?.length

  return (
    <CompetitorsClient
      competitors={competitors}
      isLive={isLive}
      compAnalysis={compAnalysis ?? undefined}
    />
  )
}
