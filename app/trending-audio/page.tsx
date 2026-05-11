export const dynamic = 'force-dynamic'

import { readCache } from '@/lib/cache'
import { trendingAudio as fallback } from '@/lib/dummy-data'
import type { DashboardAudio } from '@/lib/transform'
import TrendingAudioClient from './TrendingAudioClient'

interface CompetitorIntelCache {
  trendingAudio?: DashboardAudio[]
}

export default function TrendingAudioPage() {
  const cached = readCache<CompetitorIntelCache>('competitor-intel.json')
  const audio: DashboardAudio[] =
    cached?.trendingAudio && cached.trendingAudio.length > 0
      ? cached.trendingAudio
      : fallback

  return <TrendingAudioClient audio={audio} />
}
