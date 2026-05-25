import { ApifyClient } from 'apify-client'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

// Singleton client — reused across requests in the same server process
let _client: ApifyClient | null = null

function validateToken(token: string | undefined): string {
  const invalid = !token || token.startsWith('your_') || token.includes('token_here')
  if (invalid) throw new Error('APIFY_API_TOKEN is not set in .env.local')
  return token
}

function getClient(): ApifyClient {
  if (!_client) {
    _client = new ApifyClient({ token: validateToken(process.env.APIFY_API_TOKEN) })
  }
  return _client
}

// Raw types returned by apify/instagram-scraper
export interface ApifyPost {
  id: string
  type: string
  shortCode: string
  caption: string | null
  commentsCount: number
  likesCount: number
  videoViewCount: number | null
  timestamp: string
  url: string
  displayUrl: string
  videoUrl: string | null
  ownerUsername: string
  ownerFullName: string | null
  /** Populated by free scraper; absent in Apify output. */
  ownerFollowersCount?: number
  musicInfo?: {
    artist_name?: string
    song_name?: string
  }
}

export interface ApifyProfile {
  username: string
  fullName: string | null
  biography: string | null
  followersCount: number
  followingCount: number
  postsCount: number
  profilePicUrl: string | null
  // Posts are embedded when resultsType includes them
  latestPosts?: ApifyPost[]
}

// ── Free scraper (instaloader → playwright fallback) ──────────────────────────

function handleFromUrl(url: string): string {
  return url
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/\/$/, '')
    .split('/')[0]
    .replace(/^@/, '')
}

function extractHandles(input: Record<string, unknown>): string[] {
  const urls = (input.directUrls as string[] | undefined) ?? []
  return urls
    .map(handleFromUrl)
    .filter(Boolean)
}

async function scrapeWithBulkSession(handle: string, limit: number): Promise<ApifyPost[]> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'ig-bulk-scrape.py')
  const { stdout, stderr } = await execFileAsync(
    'python3', [scriptPath, handle, String(limit)],
    { timeout: 900_000, maxBuffer: 200 * 1024 * 1024 },
  )
  if (stderr) console.error(`[ig-bulk] @${handle}:`, stderr.slice(0, 600))
  const raw = JSON.parse(stdout)
  const posts: ApifyPost[] = Array.isArray(raw) ? raw : (raw.posts ?? [])
  const followers: number = Array.isArray(raw) ? 0 : (raw.followersCount ?? 0)
  if (followers > 0) {
    for (const p of posts) p.ownerFollowersCount = followers
  }
  return posts
}

async function scrapeWithPlaywrightFree(handle: string, limit: number): Promise<ApifyPost[]> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'playwright-ig-scrape.py')
  const { stdout, stderr } = await execFileAsync(
    'python3', [scriptPath, handle, String(Math.min(limit, 40))],
    { timeout: 360_000, maxBuffer: 50 * 1024 * 1024 },
  )
  if (stderr) console.error(`[playwright-free] @${handle}:`, stderr.slice(0, 400))
  const raw = JSON.parse(stdout)
  const posts: ApifyPost[] = Array.isArray(raw) ? raw : (raw.posts ?? [])
  const followers: number = Array.isArray(raw) ? 0 : (raw.followersCount ?? 0)
  if (followers > 0) {
    for (const p of posts) p.ownerFollowersCount = followers
  }
  return posts
}

async function scrapeWithInstaloader(handle: string, limit: number): Promise<ApifyPost[]> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'instaloader-scrape.py')
  const { stdout, stderr } = await execFileAsync(
    'python3', [scriptPath, handle, String(limit)],
    { timeout: 600_000, maxBuffer: 100 * 1024 * 1024 },
  )
  if (stderr) console.error(`[instaloader] @${handle}:`, stderr.slice(0, 400))
  const raw = JSON.parse(stdout)
  return Array.isArray(raw) ? raw as ApifyPost[] : []
}

export async function scrapeInstagramFree<T>(input: Record<string, unknown>): Promise<T[]> {
  const handles = extractHandles(input)
  const limit = (input.resultsLimit as number | undefined) ?? 50

  if (!handles.length) {
    console.warn('[free-scraper] no handles found in input, returning empty')
    return []
  }

  const allPosts: ApifyPost[] = []

  for (const handle of handles) {
    let posts: ApifyPost[] = []

    // 1. Bulk session scraper (Playwright + in-browser /api/v1/feed/user/).
    //    Fast pagination, uses saved IG session cookies — handles 1000+ posts.
    try {
      posts = await scrapeWithBulkSession(handle, limit)
      console.log(`[free-scraper] bulk-session got ${posts.length} posts for @${handle}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[free-scraper] bulk-session failed for @${handle}: ${msg.slice(0, 200)}`)
    }

    // 2. Per-post Playwright fallback (slower, capped at 40 posts).
    if (posts.length === 0) {
      try {
        posts = await scrapeWithPlaywrightFree(handle, limit)
        console.log(`[free-scraper] playwright-per-post got ${posts.length} posts for @${handle}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[free-scraper] playwright fallback failed for @${handle}: ${msg.slice(0, 200)}`)
      }
    }

    // 3. Instaloader (works only if profile is public + IG isn't blocking the IP).
    if (posts.length === 0) {
      try {
        posts = await scrapeWithInstaloader(handle, limit)
        console.log(`[free-scraper] instaloader got ${posts.length} posts for @${handle}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[free-scraper] instaloader fallback failed for @${handle}: ${msg.slice(0, 200)}`)
      }
    }

    allPosts.push(...posts)
  }

  return allPosts as unknown as T[]
}

// ── Apify scrapers ────────────────────────────────────────────────────────────

/**
 * Run apify/instagram-scraper and return typed items.
 * Uses run-sync so the route waits for results (≤60s timeout).
 */
export async function scrapeInstagram<T>(input: Record<string, unknown>): Promise<T[]> {
  const client = getClient()

  const run = await client.actor('apify/instagram-scraper').call(input)

  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  return items as T[]
}

/**
 * Scrapes Instagram posts. Uses free local scrapers (instaloader → playwright)
 * when SCRAPER=free is set, otherwise calls Apify.
 */
export async function scrapeInstagramSync<T>(
  input: Record<string, unknown>,
  timeoutSecs = 55,
): Promise<T[]> {
  if (process.env.SCRAPER === 'free') {
    return scrapeInstagramFree<T>(input)
  }

  const token = validateToken(process.env.APIFY_API_TOKEN)

  const url =
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items` +
    `?token=${token}&timeout=${timeoutSecs}&memory=512`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 30) * 1000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify responded ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json() as Promise<T[]>
}
