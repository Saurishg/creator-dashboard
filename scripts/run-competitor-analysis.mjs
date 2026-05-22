#!/usr/bin/env node
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
process.chdir(resolve(__dirname, '..'))

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { scrapeTranscribeAnalyseCompetitors } = await import('../lib/pipeline.ts')
const { transformCompetitors, extractTrendingAudio } = await import('../lib/transform.ts')
const { writeCache } = await import('../lib/cache.ts')
const { readConfig } = await import('../lib/config.ts')

const config = readConfig()
const handles = config?.competitors ?? []

if (!handles.length) { console.error('No competitors in config.json'); process.exit(1) }

console.log(`Analysing competitors: ${handles.map(h => '@' + h).join(', ')}\n`)

// Scrape each handle with Playwright (uses saved .ig-cookies.json session)
const scraperScript = resolve(__dirname, 'playwright-ig-scrape.py')
const allPosts = []
const followersByHandle = new Map()

for (const handle of handles) {
  process.stderr.write(`Scraping @${handle} with Playwright...\n`)
  try {
    const { stdout, stderr } = await execFileAsync(
      'python3', [scraperScript, handle, '20'],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
    )
    if (stderr) process.stderr.write(stderr)
    const parsed = JSON.parse(stdout.trim())
    const posts = Array.isArray(parsed) ? parsed : (parsed.posts ?? [])
    const followersCount = Array.isArray(parsed) ? 0 : (parsed.followersCount ?? 0)
    followersByHandle.set(handle.toLowerCase(), followersCount)
    if (posts.length > 0) {
      allPosts.push(...posts)
      process.stderr.write(`  Got ${posts.length} posts from @${handle} (${followersCount.toLocaleString()} followers)\n`)
    } else if (parsed.error) {
      process.stderr.write(`  Error from scraper: ${parsed.error}\n`)
    }
  } catch (err) {
    process.stderr.write(`  Failed to scrape @${handle}: ${err.message}\n`)
  }
}

if (!allPosts.length) {
  console.error('No posts scraped — aborting analysis')
  process.exit(1)
}

console.log(`\nTotal posts scraped: ${allPosts.length}\n`)

// Build competitor-intel.json (display cards) from scraped posts
const GRADIENTS = [
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#06b6d4)',
]
const byOwner = new Map()
for (const post of allPosts) {
  const h = (post.ownerUsername ?? '').toLowerCase()
  if (!h) continue
  if (!byOwner.has(h)) byOwner.set(h, [])
  byOwner.get(h).push(post)
}
const profiles = handles.map(h => ({
  username: h,
  fullName: (byOwner.get(h.toLowerCase()) ?? [])[0]?.ownerFullName ?? null,
  biography: null,
  followersCount: followersByHandle.get(h.toLowerCase()) ?? 0,
  followingCount: 0, postsCount: 0, profilePicUrl: null,
  latestPosts: byOwner.get(h.toLowerCase()) ?? [],
}))
const competitorCards = transformCompetitors(profiles, GRADIENTS)
// Fix engagement rate: compute avg (likes + comments) per post when no follower/view data
for (const card of competitorCards) {
  if (card.engRate === '0%') {
    const handle = card.handle.replace('@', '').toLowerCase()
    const posts = byOwner.get(handle) ?? []
    if (posts.length > 0) {
      const avgInteractions = Math.round(posts.reduce((s, p) => s + p.likesCount + p.commentsCount, 0) / posts.length)
      card.engRate = `${avgInteractions} avg`
    }
  }
  if (card.topViews === '0') {
    const handle = card.handle.replace('@', '').toLowerCase()
    const posts = byOwner.get(handle) ?? []
    const maxLikes = Math.max(...posts.map(p => p.likesCount), 0)
    card.topViews = maxLikes > 0 ? `${maxLikes} ❤` : '—'
    card.topViewsRaw = maxLikes
  }
}
const trendingAudio = extractTrendingAudio(allPosts)
writeCache('competitor-intel.json', { competitors: competitorCards, trendingAudio, scrapedAt: new Date().toISOString() })
console.log(`Written competitor-intel.json (${competitorCards.length} cards)\n`)

try {
  const result = await scrapeTranscribeAnalyseCompetitors(handles, (msg, pct) => {
    const filled = Math.round(pct / 5)
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled)
    process.stdout.write(`\r[${bar}] ${pct}%  ${msg.padEnd(60)}`)
  }, allPosts)
  console.log('\n\n✓ Done!')
  for (const c of result.competitors) {
    console.log(`  @${c.handle}: ${c.totalReels} reels analysed`)
  }
} catch (err) {
  console.error('\nFailed:', err.message)
  process.exit(1)
}
