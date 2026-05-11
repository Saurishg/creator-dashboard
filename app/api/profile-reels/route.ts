import { NextResponse } from 'next/server'
import { scrapeInstagramSync, type ApifyPost } from '@/lib/apify'
import { transformReels, computeStats } from '@/lib/transform'
import { requireApiAuth } from '@/lib/auth'

export async function GET(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const username = process.env.OWN_INSTAGRAM_USERNAME
  const limit    = parseInt(process.env.OWN_REELS_LIMIT ?? '10', 10)

  if (!username) {
    return NextResponse.json(
      { error: 'OWN_INSTAGRAM_USERNAME is not set in .env.local' },
      { status: 500 },
    )
  }

  try {
    const posts = await scrapeInstagramSync<ApifyPost>({
      directUrls:   [`https://www.instagram.com/${username}/`],
      resultsType:  'posts',
      resultsLimit: limit,
    })

    const reels = transformReels(posts)
    const stats = computeStats(reels)

    return NextResponse.json({ reels, stats, scrapedAt: new Date().toISOString() })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[profile-reels]', message)

    // Return a clear error so the frontend can fall back to dummy data
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
