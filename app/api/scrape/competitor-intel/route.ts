import { NextResponse } from 'next/server'
import { scrapeInstagramSync, type ApifyPost, type ApifyProfile } from '@/lib/apify'
import { transformCompetitors, extractTrendingAudio } from '@/lib/transform'
import { writeCache } from '@/lib/cache'
import { requireApiAuth } from '@/lib/auth'

export const maxDuration = 300

const COMPETITOR_GRADIENTS = [
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
]

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const handlesEnv = process.env.COMPETITOR_HANDLES
  if (!handlesEnv) {
    return NextResponse.json({ error: 'COMPETITOR_HANDLES not set' }, { status: 500 })
  }

  const handles    = handlesEnv.split(',').map((h) => h.trim()).filter(Boolean)
  const directUrls = handles.map((h) => `https://www.instagram.com/${h}/`)

  try {
    const posts = await scrapeInstagramSync<ApifyPost>(
      { directUrls, resultsType: 'posts', resultsLimit: 5 },
      55,
    )

    const byOwner = new Map<string, ApifyPost[]>()
    for (const post of posts) {
      const key = post.ownerUsername?.toLowerCase()
      if (!key) continue
      const bucket = byOwner.get(key) ?? []
      bucket.push(post)
      byOwner.set(key, bucket)
    }

    const profiles: ApifyProfile[] = handles
      .map((handle) => {
        const ownerPosts = byOwner.get(handle.toLowerCase()) ?? []
        return {
          username:       handle,
          fullName:       ownerPosts[0]?.ownerFullName ?? null,
          biography:      null,
          followersCount: ownerPosts[0]?.ownerFollowersCount ?? 0,
          followingCount: 0,
          postsCount:     0,
          profilePicUrl:  null,
          latestPosts:    ownerPosts,
        }
      })
      .filter((p) => (p.latestPosts ?? []).length > 0)

    const competitors   = transformCompetitors(profiles, COMPETITOR_GRADIENTS)
    const trendingAudio = extractTrendingAudio(posts)
    const result = { competitors, trendingAudio, scrapedAt: new Date().toISOString() }

    writeCache('competitor-intel.json', result)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[scrape/competitor-intel]', message)
    if (err instanceof Error && err.message.includes('402')) {
      return NextResponse.json({ competitors: [], trendingAudio: [], error: 'Apify credit exhausted' })
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
