import fs from 'fs'
import path from 'path'
import { readConfig } from './config'
import { scrapeAndSaveCompetitors, scrapeAndSaveProfile, transcribeAndAnalyse } from './pipeline'
import type { ApifyPost } from './apify'

const LOCK_DIR = path.join(process.cwd(), 'data', 'locks')

export interface AnalysisJobSummary {
  reels: number
  analysed: number
  competitors: number
  competitorReelsTranscribed: number
}

export interface AnalysisJobEvent {
  step: string
  progress: number
}

function ensureLockDir(): void {
  if (!fs.existsSync(LOCK_DIR)) fs.mkdirSync(LOCK_DIR, { recursive: true })
}

export async function withJobLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  ensureLockDir()
  const lockPath = path.join(LOCK_DIR, `${name}.lock`)
  let fd: number | null = null

  try {
    fd = fs.openSync(lockPath, 'wx')
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
    // Lock file exists — check if stale (older than 10 minutes)
    try {
      const lockContent = fs.readFileSync(lockPath, 'utf-8')
      const { startedAt } = JSON.parse(lockContent) as { startedAt: string }
      const ageMs = Date.now() - new Date(startedAt).getTime()
      if (ageMs > 10 * 60 * 1000) {
        fs.unlinkSync(lockPath)
        fd = fs.openSync(lockPath, 'wx')
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }))
      } else {
        throw new Error(`${name} is already running`)
      }
    } catch (inner) {
      if ((inner as Error).message?.includes('already running')) throw inner
      // Corrupt lock file — remove and retry once
      try { fs.unlinkSync(lockPath) } catch { /* ignore */ }
      throw new Error(`${name} is already running`)
    }
  }

  try {
    return await fn()
  } finally {
    if (fd != null) fs.closeSync(fd)
    try { fs.unlinkSync(lockPath) } catch { /* already removed */ }
  }
}

export async function runAnalysisJob(
  input: { username?: string; competitors?: string[] } = {},
  onEvent?: (event: AnalysisJobEvent) => void,
): Promise<AnalysisJobSummary> {
  return withJobLock('analysis', async () => {
    const config = readConfig()
    const username = (input.username || config?.username || process.env.OWN_INSTAGRAM_USERNAME || '').replace(/^@/, '').trim()
    const competitors = (input.competitors ?? config?.competitors ?? (process.env.COMPETITOR_HANDLES ?? '').split(','))
      .map((h) => h.replace(/^@/, '').trim())
      .filter(Boolean)

    if (!username) throw new Error('Creator username is required')

    onEvent?.({ step: 'Scraping creator reels from Instagram...', progress: 8 })
    const { posts: ownPosts, reels } = await scrapeAndSaveProfile(
      username,
      parseInt(process.env.OWN_REELS_LIMIT ?? '20', 10),
    )

    let competitorData: { handle: string; posts: ApifyPost[] }[] = []
    if (competitors.length > 0) {
      onEvent?.({ step: 'Scraping competitor reels from Instagram...', progress: 25 })
      const compResult = await scrapeAndSaveCompetitors(competitors)
      const byOwner = new Map<string, ApifyPost[]>()
      for (const post of compResult.rawPosts) {
        const key = post.ownerUsername?.toLowerCase()
        if (!key) continue
        const bucket = byOwner.get(key) ?? []
        bucket.push(post)
        byOwner.set(key, bucket)
      }
      competitorData = competitors
        .map((handle) => ({ handle, posts: byOwner.get(handle.toLowerCase()) ?? [] }))
        .filter((item) => item.posts.length > 0)
    }

    const ownVideoCount = ownPosts.filter((p) => p.videoUrl).length
    const compVideoCount = competitorData.reduce(
      (sum, item) => sum + Math.min(item.posts.filter((p) => p.videoUrl).length, 5),
      0,
    )
    const totalVideos = Math.max(ownVideoCount + compVideoCount, 1)

    onEvent?.({ step: 'Transcribing reels with Whisper...', progress: 33 })
    const analysisResult = await transcribeAndAnalyse(
      ownPosts,
      (step, done) => {
        const label = step === 'own'
          ? `Transcribing creator reel ${Math.min(done, ownVideoCount)}/${ownVideoCount}...`
          : `Transcribing competitor reel ${Math.max(done - ownVideoCount, 0)}/${compVideoCount}...`
        const pct = 33 + Math.round((done / totalVideos) * 52)
        onEvent?.({ step: label, progress: Math.min(pct, 85) })
      },
      competitorData,
    )

    onEvent?.({ step: 'Analysis complete', progress: 100 })
    return {
      reels: reels.length,
      analysed: analysisResult.totalReels,
      competitors: competitors.length,
      competitorReelsTranscribed: compVideoCount,
    }
  })
}
