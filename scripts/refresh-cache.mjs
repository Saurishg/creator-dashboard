#!/usr/bin/env node
// One-shot: reads playwright JSON from stdin, transforms to DashboardReel[] shape, writes profile-reels.json
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#1e1b4b,#312e81)',
  'linear-gradient(135deg,#134e4a,#0f766e)',
  'linear-gradient(135deg,#4c1d95,#6d28d9)',
  'linear-gradient(135deg,#78350f,#b45309)',
  'linear-gradient(135deg,#14532d,#15803d)',
]

const EMOJIS = { Educational: '🎓', Lifestyle: '🌅', 'Behind Scenes': '🖥️', Story: '💬', Other: '📹' }

function guessType(caption) {
  const c = (caption ?? '').toLowerCase()
  if (/tutorial|how|tip|learn|guide|explain|tool|ai|strategy|mistake|wrong|right/.test(c)) return 'Educational'
  if (/day in|routine|life|vlog|morning|night/.test(c)) return 'Lifestyle'
  if (/setup|behind|bts|studio|gear|desk/.test(c)) return 'Behind Scenes'
  if (/story|journey|struggle|honest|real talk|confession/.test(c)) return 'Story'
  return 'Educational'
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function parseTimestamp(ts) {
  if (!ts) return null
  const n = Number(ts)
  if (n > 1e9 && n < 2e10) return new Date(n * 1000).toISOString()
  if (n > 1e12) return new Date(n).toISOString()
  return null
}

// Instagram post IDs encode a timestamp: (id >> 23) + 1314220021721 = epoch_ms
function estimateDateFromId(id) {
  if (!id || !/^\d+$/.test(id)) return null
  try {
    const bigId = BigInt(id)
    const epochMs = Number(bigId >> 23n) + 1314220021721
    if (epochMs > 1e12 && epochMs < Date.now() + 86400000) return new Date(epochMs).toISOString()
  } catch {}
  return null
}

let raw = ''
process.stdin.on('data', d => (raw += d))
process.stdin.on('end', () => {
  const parsed = JSON.parse(raw)
  const posts = Array.isArray(parsed) ? parsed : (parsed.posts ?? [])

  // Exclude empty stubs: posts with no numeric id, no caption, and no engagement
  const valid = posts.filter(p => {
    if (p.id && /^\d+$/.test(p.id)) return true  // has real Instagram ID
    if (p.caption) return true                     // has caption text
    if ((p.likesCount ?? 0) > 0) return true       // has engagement
    return false                                    // stub - skip
  })
  const maxViews = Math.max(...valid.map(p => p.videoViewCount ?? p.likesCount ?? 0), 1)

  const reels = valid.map((p, i) => {
    const views = p.videoViewCount ?? 0
    const likes = p.likesCount ?? 0
    const comments = p.commentsCount ?? 0
    const type = guessType(p.caption)
    const pct = Math.round((views / maxViews) * 100)
    const dateIso = parseTimestamp(p.timestamp) || estimateDateFromId(p.id)

    return {
      id: p.id || p.shortCode,
      title: p.caption ? `"${p.caption.slice(0, 80).replace(/\n/g, ' ')}"` : 'Untitled reel',
      type,
      date: dateIso ? relativeDate(dateIso) : 'Unknown',
      dateIso,
      likes: formatNumber(likes),
      likesRaw: likes,
      comments: formatNumber(comments),
      commentsRaw: comments,
      views: formatNumber(views),
      viewsRaw: views,
      perfPct: pct,
      perfColor: type === 'Educational' ? 'indigo' : type === 'Story' ? 'green' : 'amber',
      isBest: pct === 100,
      thumbGradient: THUMB_GRADIENTS[i % THUMB_GRADIENTS.length],
      emoji: EMOJIS[type] ?? '📹',
      url: p.url || `https://www.instagram.com/p/${p.shortCode}/`,
    }
  })

  const totalReels = reels.length
  const totalViews = reels.reduce((s, r) => s + r.viewsRaw, 0)
  const totalLikes = reels.reduce((s, r) => s + r.likesRaw, 0)
  const totalComments = reels.reduce((s, r) => s + r.commentsRaw, 0)
  const avgViews = totalReels ? Math.round(totalViews / totalReels) : 0
  // When views are unavailable (image/carousel posts), use per-post avg engagement
  // This shows as "X%" in the UI - represents avg (likes+comments) per post as a proxy
  const engagementRate = totalViews > 0
    ? parseFloat(((totalLikes + totalComments) / totalViews * 100).toFixed(1))
    : totalReels > 0
      ? parseFloat(((totalLikes + totalComments) / totalReels).toFixed(1))
      : 0

  const stats = { totalReels, avgViews, bestPostingTime: computeBestTime(reels), engagementRate }
  const result = { reels, stats, scrapedAt: new Date().toISOString() }

  const cachePath = join(root, 'data', 'profile-reels.json')
  writeFileSync(cachePath, JSON.stringify(result, null, 2))
  console.log(`✓ Cached ${reels.length} reels → data/profile-reels.json`)
})

function relativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  return `${Math.floor(days / 7)} weeks ago`
}

function computeBestTime(reels) {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const buckets = new Map()
  for (const r of reels) {
    if (!r.dateIso) continue
    const d = new Date(r.dateIso)
    if (isNaN(d.getTime())) continue
    const key = `${d.getDay()}_${d.getHours()}`
    buckets.set(key, (buckets.get(key) ?? 0) + r.viewsRaw)
  }
  if (buckets.size === 0) return 'Tue 7PM'
  const best = Array.from(buckets.entries()).reduce((a, b) => b[1] > a[1] ? b : a)
  const [dayStr, hourStr] = best[0].split('_')
  const h = Number(hourStr)
  const hFmt = h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`
  return `${DAY_NAMES[Number(dayStr)]} ${hFmt}`
}
