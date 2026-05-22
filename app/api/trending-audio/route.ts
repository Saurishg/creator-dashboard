export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { scrapeInstagramSync, type ApifyPost } from '@/lib/apify'
import { extractTrendingAudio } from '@/lib/transform'
import { trendingAudio as fallback } from '@/lib/dummy-data'
import { requireApiAuth } from '@/lib/auth'

export async function GET(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const handlesEnv = process.env.COMPETITOR_HANDLES
  const ownUser    = process.env.OWN_INSTAGRAM_USERNAME

  // Build a list of profiles to mine for audio data
  const usernames = [
    ...(ownUser ? [ownUser] : []),
    ...(handlesEnv ? handlesEnv.split(',').map((h) => h.trim()) : []),
  ].filter(Boolean)

  if (usernames.length === 0) {
    return NextResponse.json({ audio: fallback, source: 'fallback' })
  }

  try {
    const directUrls = usernames.map((u) => `https://www.instagram.com/${u}/`)

    // Pull more posts so we get a better audio sample
    const posts = await scrapeInstagramSync<ApifyPost>({
      directUrls,
      resultsType:  'posts',
      resultsLimit: 20,
    })

    const audio = extractTrendingAudio(posts)

    // If the scraper found no audio metadata, fall back to dummy data
    if (audio.length === 0) {
      return NextResponse.json({ audio: fallback, source: 'fallback' })
    }

    return NextResponse.json({ audio, source: 'live', scrapedAt: new Date().toISOString() })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[trending-audio]', message)
    // Non-fatal: just return dummy data so the UI doesn't break
    return NextResponse.json({ audio: fallback, source: 'fallback', error: message })
  }
}
