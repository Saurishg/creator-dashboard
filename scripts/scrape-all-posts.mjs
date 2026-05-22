#!/usr/bin/env node
// Scrapes all posts and prints them — no transcription, no AI analysis.
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.chdir(resolve(__dirname, '..'))

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { scrapeInstagramSync } = await import('../lib/apify.ts')
const { transformReels, computeStats } = await import('../lib/transform.ts')

const username = process.env.OWN_INSTAGRAM_USERNAME
const limit = parseInt(process.env.OWN_REELS_LIMIT ?? '200', 10)

console.error(`Scraping @${username} — up to ${limit} posts…`)

const posts = await scrapeInstagramSync(
  { directUrls: [`https://www.instagram.com/${username}/`], resultsType: 'posts', resultsLimit: limit },
  600,
)

console.error(`Got ${posts.length} posts. Printing…\n`)

const sorted = [...posts].sort((a, b) => (b.videoViewCount ?? 0) - (a.videoViewCount ?? 0))

for (let i = 0; i < sorted.length; i++) {
  const p = sorted[i]
  const views   = p.videoViewCount ?? 0
  const likes   = p.likesCount ?? 0
  const comments = p.commentsCount ?? 0
  const score   = views > 0 ? ((likes + comments * 3) / views * 100).toFixed(1) : '—'
  const caption = (p.caption ?? '').replace(/\n/g, ' ').trim()
  const date    = p.timestamp ? new Date(p.timestamp).toISOString().slice(0,10) : ''
  const type    = p.productType ?? p.type ?? ''

  console.log(`${String(i+1).padStart(4)}. [${String(views).padStart(6)}v | ${String(likes).padStart(4)}L | ${String(comments).padStart(3)}C | score:${String(score).padStart(5)}] [${date}] [${type}]`)
  console.log(`      ${caption.slice(0, 140)}`)
  console.log(`      ${p.url ?? ''}`)
  console.log()
}

console.error(`\nTotal: ${posts.length} posts`)
