import { NextResponse } from 'next/server'
import { scrapeInstagramSync, type ApifyPost, type ApifyProfile } from '@/lib/apify'
import { transformCompetitors, extractTrendingAudio } from '@/lib/transform'
import { requireApiAuth } from '@/lib/auth'

const COMPETITOR_GRADIENTS = [
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
]

function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const name = (err as Error & { name?: string }).name
  return (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    err.message.includes('aborted') ||
    err.message.includes('timeout')
  )
}

export async function GET(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const handlesEnv = process.env.COMPETITOR_HANDLES
  if (!handlesEnv) {
    return NextResponse.json({ competitors: [], trendingAudio: [] })
  }

  const handles = handlesEnv.split(',').map((h) => h.trim()).filter(Boolean)
  const directUrls = handles.map((h) => `https://www.instagram.com/${h}/`)

  try {
    // 40-second Apify timeout — returns whatever it collected, even if partial.
    // Keeps total route latency under ~45s so the UI doesn't hang.
    const posts = await scrapeInstagramSync<ApifyPost>(
      { directUrls, resultsType: 'posts', resultsLimit: 5 },
      40,
    )

    // Group posts by ownerUsername, preserving handle order
    const byOwner = new Map<string, ApifyPost[]>()
    for (const post of posts) {
      const bucket = byOwner.get(post.ownerUsername) ?? []
      bucket.push(post)
      byOwner.set(post.ownerUsername, bucket)
    }

    // Build synthetic profiles; skip handles that returned no posts
    const profiles: ApifyProfile[] = handles
      .map((handle) => {
        const ownerPosts =
          byOwner.get(handle) ??
          byOwner.get(handle.toLowerCase()) ??
          []
        return {
          username:       handle,
          fullName:       ownerPosts[0]?.ownerFullName ?? null,
          biography:      null,
          followersCount: 0,
          followingCount: 0,
          postsCount:     0,
          profilePicUrl:  null,
          latestPosts:    ownerPosts,
        }
      })
      .filter((p) => (p.latestPosts ?? []).length > 0)

    const competitors   = transformCompetitors(profiles, COMPETITOR_GRADIENTS)
    const trendingAudio = extractTrendingAudio(posts)

    return NextResponse.json({
      competitors,
      trendingAudio,
      scrapedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[competitor-intel]', message)

    // Timeouts are non-fatal — return empty so the UI shows demo data cleanly
    if (isTimeoutError(err)) {
      return NextResponse.json({ competitors: [], trendingAudio: [] })
    }

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
