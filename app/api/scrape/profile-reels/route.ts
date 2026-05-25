import { NextResponse } from 'next/server'
import { scrapeInstagramSync, type ApifyPost } from '@/lib/apify'
import { transformReels, computeStats } from '@/lib/transform'
import { readCache, writeCache } from '@/lib/cache'
import { requireApiAuth } from '@/lib/auth'

export const maxDuration = 300

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const username = process.env.OWN_INSTAGRAM_USERNAME
  const limit = parseInt(process.env.OWN_REELS_LIMIT ?? '30', 10)

  if (!username) {
    return NextResponse.json({ error: 'OWN_INSTAGRAM_USERNAME not set' }, { status: 500 })
  }

  try {
    const posts = await scrapeInstagramSync<ApifyPost>(
      {
        directUrls:   [`https://www.instagram.com/${username}/`],
        resultsType:  'posts',
        resultsLimit: limit,
      },
      55,
    )

    const reels = transformReels(posts)
    const stats = computeStats(reels)
    const result = { reels, stats, scrapedAt: new Date().toISOString() }

    writeCache('profile-reels.json', result)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[scrape/profile-reels]', message)
    if (err instanceof Error && err.message.includes('402')) {
      const cached = readCache<object>('profile-reels.json')
      if (cached) return NextResponse.json({ ...cached, fromCache: true })
      return NextResponse.json({ reels: [], stats: null, fromCache: true, error: 'Apify credit exhausted' })
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
