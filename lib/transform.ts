import type { ApifyPost, ApifyProfile } from './apify'

// ── Shared dashboard types ────────────────────────────────────────────────────

export type ReelType = 'Educational' | 'Lifestyle' | 'Behind Scenes' | 'Story' | 'Other'

export interface DashboardReel {
  id: string
  title: string
  type: ReelType
  date: string
  dateIso?: string
  likes: string
  likesRaw: number
  comments: string
  commentsRaw: number
  views: string
  viewsRaw: number
  perfPct: number       // 0–100, relative to best reel in the set
  perfColor: string
  isBest: boolean
  thumbGradient: string
  emoji: string
  url: string
}

export interface DashboardCompetitor {
  initials: string
  gradient: string
  handle: string
  followers: string
  followersRaw: number
  engRate: string
  topViews: string
  topViewsRaw: number
}

export interface DashboardStats {
  totalReels: number
  avgViews: number
  bestPostingTime: string
  engagementRate: number
}

export interface DashboardAudio {
  name: string
  sub: string
  badge: string
  badgeColor: string
  delays: number[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 14) return '1 week ago'
  return `${Math.floor(days / 7)} weeks ago`
}

// Guess content type from caption keywords
function guessType(caption: string | null): ReelType {
  const c = (caption ?? '').toLowerCase()
  if (/tutorial|how|tip|learn|guide|explain|tool|ai|strategy|mistake|wrong|right/.test(c)) return 'Educational'
  if (/day in|routine|life|vlog|morning|night/.test(c)) return 'Lifestyle'
  if (/setup|behind|bts|studio|gear|desk/.test(c)) return 'Behind Scenes'
  if (/story|journey|struggle|honest|real talk|confession/.test(c)) return 'Story'
  return 'Educational' // default for creator content
}

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#1e1b4b,#312e81)',
  'linear-gradient(135deg,#134e4a,#0f766e)',
  'linear-gradient(135deg,#4c1d95,#6d28d9)',
  'linear-gradient(135deg,#78350f,#b45309)',
  'linear-gradient(135deg,#14532d,#15803d)',
  'linear-gradient(135deg,#1e3a5f,#2563eb)',
  'linear-gradient(135deg,#3b0764,#7c3aed)',
  'linear-gradient(135deg,#450a0a,#dc2626)',
]

const EMOJIS_BY_TYPE: Record<ReelType, string> = {
  Educational:    '🎓',
  Lifestyle:      '🌅',
  'Behind Scenes':'🖥️',
  Story:          '💬',
  Other:          '📹',
}

const PERF_COLORS: Record<string, string> = {
  Educational:    'indigo',
  Lifestyle:      'amber',
  'Behind Scenes':'amber',
  Story:          'green',
  Other:          'green',
}

// ── Main transformers ─────────────────────────────────────────────────────────

export function transformReels(posts: ApifyPost[]): DashboardReel[] {
  // Include all posts (videos, images, carousels) — engagement analytics apply to all content types
  const videos = posts.filter((p) => p.id || p.shortCode) // exclude stubs with no id

  if (videos.length === 0) return []

  // Use likes as fallback performance metric when view count is unavailable
  const maxViews = Math.max(...videos.map((p) => p.videoViewCount ?? p.likesCount ?? 0), 1)

  return videos.map((post, i) => {
    const views = post.videoViewCount ?? 0
    const type  = guessType(post.caption)
    const pct   = Math.round((views / maxViews) * 100)

    return {
      id:            post.id,
      title:         post.caption ? `"${post.caption.slice(0, 80).replace(/\n/g, ' ')}"` : 'Untitled reel',
      type,
      date:          relativeDate(post.timestamp),
      dateIso:       post.timestamp,
      likes:         formatNumber(post.likesCount),
      likesRaw:      post.likesCount,
      comments:      formatNumber(post.commentsCount),
      commentsRaw:   post.commentsCount,
      views:         formatNumber(views),
      viewsRaw:      views,
      perfPct:       pct,
      perfColor:     PERF_COLORS[type],
      isBest:        pct === 100,
      thumbGradient: THUMB_GRADIENTS[i % THUMB_GRADIENTS.length],
      emoji:         EMOJIS_BY_TYPE[type],
      url:           post.url,
    }
  })
}

export function parseFormattedNumber(s: string): number {
  const n = parseFloat(s)
  if (s.endsWith('M')) return n * 1_000_000
  if (s.endsWith('K')) return n * 1_000
  return n
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatHour(h: number): string {
  if (h === 0)  return '12AM'
  if (h < 12)   return `${h}AM`
  if (h === 12) return '12PM'
  return `${h - 12}PM`
}

function computeBestPostingTime(reels: DashboardReel[]): string {
  const buckets = new Map<string, number>()
  for (const reel of reels) {
    if (!reel.dateIso) continue
    const d = new Date(reel.dateIso)
    if (isNaN(d.getTime())) continue
    const key = `${d.getDay()}_${d.getHours()}`
    buckets.set(key, (buckets.get(key) ?? 0) + reel.viewsRaw)
  }
  if (buckets.size === 0) return 'Tue 7PM'
  const best = Array.from(buckets.entries()).reduce((a, b) => (b[1] > a[1] ? b : a))
  const [dayStr, hourStr] = best[0].split('_')
  return `${DAY_NAMES[Number(dayStr)]} ${formatHour(Number(hourStr))}`
}

export function computeStats(reels: DashboardReel[]): DashboardStats {
  const totalReels = reels.length
  if (totalReels === 0) {
    return { totalReels: 0, avgViews: 0, bestPostingTime: 'Tue 7PM', engagementRate: 0 }
  }

  const totalViews    = reels.reduce((s, r) => s + r.viewsRaw, 0)
  const totalLikes    = reels.reduce((s, r) => s + (r.likesRaw ?? 0), 0)
  const totalComments = reels.reduce((s, r) => s + (r.commentsRaw ?? 0), 0)
  const avgViews      = Math.round(totalViews / totalReels)
  const engRate       = totalViews > 0
    ? parseFloat((((totalLikes + totalComments) / totalViews) * 100).toFixed(1))
    : totalReels > 0
      ? parseFloat(((totalLikes + totalComments) / totalReels).toFixed(1))
      : 0

  return {
    totalReels,
    avgViews,
    bestPostingTime: computeBestPostingTime(reels),
    engagementRate: engRate,
  }
}

export function transformCompetitors(
  profiles: ApifyProfile[],
  gradients: string[],
): DashboardCompetitor[] {
  return profiles.map((p, i) => {
    const initials = p.username
      .split(/[._-]/)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('')

    // Top reel views: use max of latestPosts if available
    const topViews = p.latestPosts?.length
      ? Math.max(...p.latestPosts.map((post) => post.videoViewCount ?? 0))
      : 0

    const posts = p.latestPosts ?? []
    const avgLikes    = posts.length ? posts.reduce((s, post) => s + post.likesCount, 0) / posts.length : 0
    const avgComments = posts.length ? posts.reduce((s, post) => s + post.commentsCount, 0) / posts.length : 0
    const avgViews    = posts.length ? posts.reduce((s, post) => s + (post.videoViewCount ?? 0), 0) / posts.length : 0

    // Prefer follower-based engagement; fall back to view-based when no follower data
    const engRate = p.followersCount > 0
      ? parseFloat(((avgLikes + avgComments) / p.followersCount * 100).toFixed(1))
      : avgViews > 0
        ? parseFloat(((avgLikes + avgComments) / avgViews * 100).toFixed(1))
        : 0

    return {
      initials:      initials || p.username.slice(0, 2).toUpperCase(),
      gradient:      gradients[i] ?? 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      handle:        `@${p.username}`,
      followers:     p.followersCount > 0 ? formatNumber(p.followersCount) : '—',
      followersRaw:  p.followersCount,
      engRate:       `${engRate}%`,
      topViews:      formatNumber(topViews),
      topViewsRaw:   topViews,
    }
  })
}

// Extract audio names from reels to produce a "trending in your niche" list
export function extractTrendingAudio(posts: ApifyPost[]): DashboardAudio[] {
  const WAVE_DELAY_SETS = [
    [0, 0.1, 0.2, 0.15, 0.05, 0.25, 0.1],
    [0.1, 0.2, 0.05, 0.15, 0.3, 0.0, 0.25],
    [0.2, 0.0, 0.15, 0.3, 0.05, 0.1, 0.25],
    [0.05, 0.25, 0.1, 0.0, 0.2, 0.15, 0.3],
  ]

  // Count how many times each track appears
  const counts = new Map<string, { artist: string; song: string; count: number }>()
  for (const post of posts) {
    const artist = post.musicInfo?.artist_name ?? ''
    const song   = post.musicInfo?.song_name   ?? ''
    if (!artist && !song) continue
    const key  = `${artist}||${song}`
    const prev = counts.get(key)
    if (prev) prev.count++
    else counts.set(key, { artist, song, count: 1 })
  }

  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 4)

  const badges = ['🔥 Hot', '📈 Rising', '♾️ Stable', '🚀 Breakout']
  const colors = ['#8b5cf6', '#f59e0b', '#06b6d4', '#8b5cf6']

  return sorted.map((t, i) => ({
    name:       t.artist ? `${t.song} — ${t.artist}` : t.song,
    sub:        `${t.count} reel${t.count !== 1 ? 's' : ''} in your niche`,
    badge:      badges[i] ?? '🎵 Audio',
    badgeColor: colors[i] ?? '#6366f1',
    delays:     WAVE_DELAY_SETS[i] ?? WAVE_DELAY_SETS[0],
  }))
}
