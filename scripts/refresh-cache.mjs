#!/usr/bin/env node
// One-shot: reads playwright JSON from stdin, transforms, writes profile-reels.json cache
import { execFileSync } from 'child_process'
import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let raw = ''
process.stdin.on('data', d => (raw += d))
process.stdin.on('end', () => {
  const parsed = JSON.parse(raw)
  const posts = Array.isArray(parsed) ? parsed : (parsed.posts ?? [])

  // Replicate transformReels logic inline to avoid TS import issues
  const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#06b6d4)',
    'linear-gradient(135deg,#f97316,#f59e0b)',
    'linear-gradient(135deg,#06b6d4,#6366f1)',
  ]

  // Include all posts with a real id (not playwright stubs)
  const reels = posts
    .filter(p => p.id || p.shortCode)
    .map((p, i) => ({
      id:              p.id || p.shortCode,
      shortCode:       p.shortCode,
      url:             p.url,
      title:           p.caption ? `"${p.caption.slice(0, 80).replace(/\n/g, ' ')}"` : 'Untitled reel',
      caption:         p.caption ?? '',
      views:           p.videoViewCount ?? 0,
      likes:           p.likesCount ?? 0,
      comments:        p.commentsCount ?? 0,
      engagementScore: (p.videoViewCount ?? 0) > 0
        ? parseFloat(((p.likesCount + p.commentsCount * 3) / p.videoViewCount * 100).toFixed(2))
        : (p.likesCount + p.commentsCount * 3),
      postedAt:        p.timestamp ? new Date(parseInt(p.timestamp) * 1000).toISOString() : null,
      thumbGradient:   GRADIENTS[i % GRADIENTS.length],
      musicInfo:       p.musicInfo ?? null,
      hashtags:        p.hashtags ?? [],
    }))

  const totalReels = reels.length
  const totalViews = reels.reduce((s, r) => s + r.views, 0)
  const totalLikes = reels.reduce((s, r) => s + r.likes, 0)
  const totalComments = reels.reduce((s, r) => s + r.comments, 0)
  const avgViews = totalReels ? Math.round(totalViews / totalReels) : 0
  const avgLikes = totalReels ? Math.round(totalLikes / totalReels) : 0
  const avgComments = totalReels ? Math.round(totalComments / totalReels) : 0
  const avgEngagement = totalReels
    ? parseFloat((reels.reduce((s, r) => s + r.engagementScore, 0) / totalReels).toFixed(2))
    : 0
  const topReel = reels.sort((a, b) => b.views - a.views)[0] ?? null

  const stats = { totalReels, totalViews, totalLikes, totalComments, avgViews, avgLikes, avgComments, avgEngagement, topReel }

  const result = { reels, stats, scrapedAt: new Date().toISOString() }
  const cachePath = join(root, 'data', 'profile-reels.json')
  writeFileSync(cachePath, JSON.stringify(result, null, 2))
  console.log(`✓ Cached ${reels.length} reels → data/profile-reels.json`)
})
