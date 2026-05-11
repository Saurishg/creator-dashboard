import { ApifyClient } from 'apify-client'

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
 * Lightweight version — uses the run-sync REST endpoint so there's no
 * polling loop. Falls back gracefully on timeout.
 */
export async function scrapeInstagramSync<T>(
  input: Record<string, unknown>,
  timeoutSecs = 55,
): Promise<T[]> {
  const token = validateToken(process.env.APIFY_API_TOKEN)

  const url =
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items` +
    `?token=${token}&timeout=${timeoutSecs}&memory=512`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    // Give fetch 10 s more than Apify's own timeout
    signal: AbortSignal.timeout((timeoutSecs + 30) * 1000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify responded ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json() as Promise<T[]>
}
