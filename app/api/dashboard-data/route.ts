import { NextResponse } from 'next/server'
import { readCache } from '@/lib/cache'
import { readConfig } from '@/lib/config'
import type { DashboardReel, DashboardCompetitor, DashboardStats, DashboardAudio } from '@/lib/transform'
import type { AnalysisResult } from '@/lib/analysis-types'
import { requireApiAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface ProfileCache { reels: DashboardReel[]; stats: DashboardStats; scrapedAt?: string }
interface CompetitorCache { competitors: DashboardCompetitor[]; trendingAudio: DashboardAudio[]; scrapedAt?: string }

export async function GET(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const config = readConfig()
  const profileCache  = readCache<ProfileCache>('profile-reels.json')
  const compCache     = readCache<CompetitorCache>('competitor-intel.json')
  const analysisCache = readCache<AnalysisResult>('analysis.json')

  return NextResponse.json({
    username:      config?.username ?? null,
    reels:         profileCache?.reels ?? [],
    stats:         profileCache?.stats ?? null,
    competitors:   compCache?.competitors ?? [],
    trendingAudio: compCache?.trendingAudio ?? [],
    analysis:      analysisCache ?? null,
    scrapedAt:     profileCache?.scrapedAt ?? null,
    fetchedAt:     new Date().toISOString(),
  })
}
