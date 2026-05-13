import { scrapeInstagramSync, type ApifyPost, type ApifyProfile } from './apify'
import { transformReels, computeStats, transformCompetitors, extractTrendingAudio } from './transform'
import { getOpenAI, LOCAL_MODEL, WHISPER_MODEL } from './openai-client'
import { readCache, writeCache } from './cache'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { ReelBreakdown, ContentPatterns, AnalysisResult } from './analysis-types'
import { creatorHandle, readCreatorProfile } from './creator-profile'
import { parseJsonObject } from './json'

const execFileAsync = promisify(execFile)

// ── Helpers ───────────────────────────────────────────────────────────────────

function engagementScore(views: number, likes: number, comments: number): number {
  if (views === 0) return 0
  return parseFloat(((likes + comments * 3) / views * 100).toFixed(2))
}

async function transcribeVideo(videoUrl: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'))
  const videoPath = path.join(tmpDir, 'reel.mp4')
  try {
    const res = await fetch(videoUrl, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`Video download failed: ${res.status}`)
    fs.writeFileSync(videoPath, Buffer.from(await res.arrayBuffer()))
    const { stdout } = await execFileAsync(
      'whisper', [videoPath, '--model', WHISPER_MODEL, '--output_format', 'txt', '--output_dir', tmpDir, '--fp16', 'False'],
      { timeout: 120_000 },
    )
    const txtPath = path.join(tmpDir, 'reel.txt')
    if (fs.existsSync(txtPath)) return fs.readFileSync(txtPath, 'utf-8').trim()
    return stdout.trim()
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }) } catch { /* ignore */ }
  }
}

interface TranscriptCache {
  [reelId: string]: {
    transcript: string
    updatedAt: string
  }
}

async function transcribePost(post: ApifyPost): Promise<string> {
  const transcripts = readCache<TranscriptCache>('transcripts.json') ?? {}
  const cached = transcripts[post.id]?.transcript
  if (cached) return cached

  if (!post.videoUrl) return ''
  const transcript = await transcribeVideo(post.videoUrl)
  transcripts[post.id] = { transcript, updatedAt: new Date().toISOString() }
  writeCache('transcripts.json', transcripts)
  return transcript
}

interface CompetitorTranscript {
  handle: string
  reelId: string
  views: number
  likes: number
  comments: number
  transcript: string
  hook: string
  body: string
  cta: string
  hookType: string
}

async function analyseWithGPT(
  partials: Omit<ReelBreakdown, 'hook' | 'body' | 'cta' | 'hookType' | 'emotionalTrigger'>[],
  competitorTranscripts: CompetitorTranscript[] = [],
): Promise<{ individual: Pick<ReelBreakdown, 'reelId' | 'hook' | 'body' | 'cta' | 'hookType' | 'emotionalTrigger'>[]; patterns: ContentPatterns; competitorInsights?: import('./analysis-types').CompetitorInsight[] }> {
  const openai = getOpenAI()
  const profile = readCreatorProfile()
  const handle = creatorHandle(profile)

  const ownReelsText = partials.map((r) => {
    const cap = (r as { caption?: string }).caption?.trim()
    return `REEL ${r.reelId} | Views:${r.views} | Caption: ${cap || '(none)'}`
  }).join('\n')

  const competitorSummary = competitorTranscripts.length > 0
    ? `\nCOMPETITOR context (for patterns only — NOT in individual array):\n` +
      competitorTranscripts.map((r) =>
        `@${r.handle} | Views:${r.views} | Caption: ${(r.transcript || '').slice(0, 80)}`
      ).join('\n')
    : ''

  const completion = await openai.chat.completions.create({
    model: LOCAL_MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content: `You are an Instagram content strategist for ${profile.contentNiche} creators.`,
      },
      {
        role: 'user',
        content: `Analyse ${partials.length} reels from ${handle} (lifestyle/fashion/music creator — captions ARE the hooks, transcripts are song lyrics).

For EACH reel return reelId (EXACTLY as shown), hook (= caption text), body, cta, hookType (Bold claim|Shocking number|Question|Story opener|Warning/Don't|Contrarian|Social proof|Future promise), emotionalTrigger (Curiosity|FOMO|Authority|Social proof|Aspiration|Excitement).

Also return patterns: topHookTypes (array), topCTAFormats (array), commonBodyStructure, bestPerformingPattern, weaknesses (3 items), recommendations (5 items), winningFormula, avgEngagementByHookType (object).

Return ONLY valid JSON: {"individual":[{"reelId":"...","hook":"...","body":"...","cta":"...","hookType":"...","emotionalTrigger":"..."}],"patterns":{"topHookTypes":[],"topCTAFormats":[],"commonBodyStructure":"...","bestPerformingPattern":"...","weaknesses":[],"recommendations":[],"winningFormula":"...","avgEngagementByHookType":{}}}

Reels:
${ownReelsText}${competitorSummary}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  return parseJsonObject(completion.choices[0]?.message?.content ?? '{}', {
    individual: [],
    patterns: {
      topHookTypes: [],
      topCTAFormats: [],
      commonBodyStructure: '',
      bestPerformingPattern: '',
      weaknesses: [],
      recommendations: [],
      winningFormula: '',
      avgEngagementByHookType: {},
    },
  })
}

// ── Public pipeline steps ─────────────────────────────────────────────────────

const COMPETITOR_GRADIENTS = [
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#06b6d4)',
]

export async function scrapeTranscribeAnalyseCompetitors(
  handles: string[],
  onProgress?: (msg: string, pct: number) => void,
): Promise<import('./analysis-types').CompetitorAnalysisResult> {
  // 1. Scrape posts
  onProgress?.('Scraping competitor reels from Instagram…', 5)
  const directUrls = handles.map((h) => `https://www.instagram.com/${h}/`)
  const posts = await scrapeInstagramSync<ApifyPost>(
    { directUrls, resultsType: 'posts', resultsLimit: 10 },
    180,
  )

  // Save raw posts for future use
  writeCache('competitor-raw-posts.json', { posts, scrapedAt: new Date().toISOString() })

  // Group by owner
  const byOwner = new Map<string, ApifyPost[]>()
  for (const post of posts) {
    const h = post.ownerUsername?.toLowerCase()
    if (!h) continue
    const bucket = byOwner.get(h) ?? []
    bucket.push(post)
    byOwner.set(h, bucket)
  }

  // 2. Transcribe per competitor (up to 8 reels each)
  const results: import('./analysis-types').CompetitorFullAnalysis[] = []
  let doneCount = 0
  const totalHandles = handles.length

  for (const handle of handles) {
    const ownerPosts = byOwner.get(handle.toLowerCase()) ?? []
    const videos = ownerPosts
      .filter((p) => p.videoUrl && ((p.videoViewCount ?? 0) > 0 || p.type === 'Video' || p.type === 'Reel'))
      .slice(0, 8)

    if (videos.length === 0) continue

    onProgress?.(`Transcribing @${handle} reels (${videos.length} videos)…`, 10 + (doneCount / totalHandles) * 60)

    const partials: Omit<ReelBreakdown, 'hook' | 'body' | 'cta' | 'hookType' | 'emotionalTrigger'>[] = []
    const BATCH = 4
    for (let i = 0; i < videos.length; i += BATCH) {
      const batch = videos.slice(i, i + BATCH)
      const batchResults = await Promise.all(batch.map(async (post) => {
        let transcript = ''
        if (post.videoUrl) {
          try { transcript = await transcribePost(post) } catch { /* silence */ }
        }
        return {
          reelId: post.id, url: post.url,
          views: post.videoViewCount ?? 0, likes: post.likesCount, comments: post.commentsCount,
          transcript,
          engagementScore: engagementScore(post.videoViewCount ?? 0, post.likesCount, post.commentsCount),
        }
      }))
      partials.push(...batchResults)
    }

    // 3. phi4 analysis for this competitor
    onProgress?.(`Analysing @${handle} content with phi4…`, 70 + (doneCount / totalHandles) * 20)

    const openai = getOpenAI()
    const reelsText = partials.map((r) =>
      `REEL ${r.reelId}\nViews: ${r.views} | Likes: ${r.likes} | Comments: ${r.comments}\nTranscript:\n${r.transcript || '(no transcript)'}\n---`
    ).join('\n\n')

    let gptResult: { individual: Pick<ReelBreakdown, 'reelId' | 'hook' | 'body' | 'cta' | 'hookType' | 'emotionalTrigger'>[]; patterns: ContentPatterns } = { individual: [], patterns: {} as ContentPatterns }
    try {
      const completion = await openai.chat.completions.create({
        model: LOCAL_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert Instagram content strategist specialising in AI/tech short-form video.' },
          {
            role: 'user',
            content: `Analyse these ${partials.length} Instagram Reels from @${handle}.

For EACH reel extract: hook, body, cta, hookType (Bold claim|Shocking number|Question|Story opener|Warning/Don't|Contrarian|Social proof|Future promise), emotionalTrigger (Curiosity|FOMO|Authority|Social proof|Aspiration|Excitement).

Then summarise ALL reels: topHookTypes (ranked by high-view freq), topCTAFormats, commonBodyStructure, bestPerformingPattern, weaknesses (3 items), recommendations (3 items), winningFormula, avgEngagementByHookType.

Return ONLY valid JSON:
{"individual":[{"reelId":"...","hook":"...","body":"...","cta":"...","hookType":"...","emotionalTrigger":"..."}],"patterns":{"topHookTypes":[],"topCTAFormats":[],"commonBodyStructure":"...","bestPerformingPattern":"...","weaknesses":[],"recommendations":[],"winningFormula":"...","avgEngagementByHookType":{}}}

Reels:
${reelsText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })
      gptResult = parseJsonObject(completion.choices[0]?.message?.content ?? '{}', gptResult)
    } catch { /* use empty result */ }

    const indivList = Array.isArray(gptResult.individual) ? gptResult.individual : []
    const breakdowns: ReelBreakdown[] = partials.map((p) => {
      const gpt = indivList.find((g) => g.reelId === p.reelId)
      return { ...p, hook: gpt?.hook ?? '', body: gpt?.body ?? '', cta: gpt?.cta ?? '', hookType: gpt?.hookType ?? 'Other', emotionalTrigger: gpt?.emotionalTrigger ?? 'Curiosity' }
    })

    results.push({ handle, totalReels: breakdowns.length, breakdowns, patterns: gptResult.patterns })
    doneCount++
  }

  const result: import('./analysis-types').CompetitorAnalysisResult = {
    analysedAt: new Date().toISOString(),
    competitors: results,
  }
  writeCache('competitor-analysis.json', result)
  onProgress?.('Competitor analysis complete!', 100)
  return result
}

export async function scrapeAndSaveProfile(username: string, limit = 10) {
  const posts = await scrapeInstagramSync<ApifyPost>(
    { directUrls: [`https://www.instagram.com/${username}/`], resultsType: 'posts', resultsLimit: limit },
    180,
  )
  const reels = transformReels(posts)
  const stats = computeStats(reels)
  const result = { reels, stats, scrapedAt: new Date().toISOString() }
  writeCache('profile-reels.json', result)
  return { posts, reels, stats }
}

export async function scrapeAndSaveCompetitors(handles: string[]) {
  // Scrape each account individually — batch scraping times out on 3+ accounts
  const allPosts: ApifyPost[] = []
  for (const handle of handles) {
    try {
      const posts = await scrapeInstagramSync<ApifyPost>(
        { directUrls: [`https://www.instagram.com/${handle}/`], resultsType: 'posts', resultsLimit: 8 },
        120,
      )
      allPosts.push(...posts)
    } catch { /* account blocked or private — continue */ }
  }
  const posts = allPosts
  const byOwner = new Map<string, ApifyPost[]>()
  for (const post of posts) {
    if (!post.ownerUsername) continue
    const key = post.ownerUsername.toLowerCase()
    const bucket = byOwner.get(key) ?? []
    bucket.push(post)
    byOwner.set(key, bucket)
  }
  const profiles: ApifyProfile[] = handles
    .map((h) => ({
      username: h,
      fullName: (byOwner.get(h.toLowerCase()) ?? [])[0]?.ownerFullName ?? null,
      biography: null,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      profilePicUrl: null,
      latestPosts: byOwner.get(h.toLowerCase()) ?? [],
    }))

  const competitors = transformCompetitors(profiles, COMPETITOR_GRADIENTS)
  const trendingAudio = extractTrendingAudio(posts)
  const result = { competitors, trendingAudio, scrapedAt: new Date().toISOString() }
  writeCache('competitor-intel.json', result)
  // Save raw posts so transcription can run later without re-scraping
  writeCache('competitor-raw-posts.json', { posts, scrapedAt: new Date().toISOString() })
  return { ...result, rawPosts: posts }
}

async function transcribePosts(
  posts: ApifyPost[],
  cap: number,
  onProgress?: (done: number, total: number) => void,
) {
  const videos = posts
    .filter((p) => p.videoUrl && ((p.videoViewCount ?? 0) > 0 || p.type === 'Video' || p.type === 'Reel'))
    .slice(0, cap)

  const BATCH = 4
  const results: Omit<ReelBreakdown, 'hook' | 'body' | 'cta' | 'hookType' | 'emotionalTrigger'>[] = []

  for (let i = 0; i < videos.length; i += BATCH) {
    const batch = videos.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      batch.map(async (post) => {
        let transcript = ''
        if (post.videoUrl) {
          try { transcript = await transcribePost(post) }
          catch { /* music-only or download failed */ }
        }
        return {
          reelId:          post.id,
          url:             post.url,
          views:           post.videoViewCount ?? 0,
          likes:           post.likesCount,
          comments:        post.commentsCount,
          transcript,
          caption:         post.caption ?? '',
          engagementScore: engagementScore(post.videoViewCount ?? 0, post.likesCount, post.commentsCount),
        }
      }),
    )
    results.push(...batchResults)
    onProgress?.(Math.min(i + BATCH, videos.length), videos.length)
  }

  return results
}

export async function transcribeAndAnalyse(
  ownPosts: ApifyPost[],
  onProgress?: (step: string, done: number, total: number) => void,
  competitorPosts?: { handle: string; posts: ApifyPost[] }[],
): Promise<AnalysisResult> {
  // 1. Transcribe own reels (cap 15)
  const ownTotal = Math.min(
    ownPosts.filter((p) => p.videoUrl && ((p.videoViewCount ?? 0) > 0 || p.type === 'Video' || p.type === 'Reel')).length,
    15,
  )
  const partials = await transcribePosts(ownPosts, 15, (done, total) => {
    onProgress?.('own', done, total)
  })

  // 2. Transcribe competitor reels (cap 5 per competitor)
  const competitorTranscripts: CompetitorTranscript[] = []
  if (competitorPosts?.length) {
    for (const { handle, posts } of competitorPosts) {
      const compVideos = posts
        .filter((p) => p.videoUrl && ((p.videoViewCount ?? 0) > 0 || p.type === 'Video' || p.type === 'Reel'))
        .slice(0, 5)

      const total = ownTotal + competitorTranscripts.length + compVideos.length
      let done = ownTotal + competitorTranscripts.length

      for (const post of compVideos) {
        let transcript = ''
        if (post.videoUrl) {
          try { transcript = await transcribePost(post) }
          catch { /* silence */ }
        }
        done++
        onProgress?.('competitor', done, total)
        competitorTranscripts.push({
          handle,
          reelId:   post.id,
          views:    post.videoViewCount ?? 0,
          likes:    post.likesCount,
          comments: post.commentsCount,
          transcript,
          hook:     '',
          body:     '',
          cta:      '',
          hookType: '',
        })
      }
    }
  }

  // 3. phi4 analysis with both own + competitor transcripts
  const gptResult = await analyseWithGPT(partials, competitorTranscripts)
  const individual = Array.isArray(gptResult.individual) ? gptResult.individual : []
  const patterns = gptResult.patterns
  const competitorInsights = gptResult.competitorInsights

  const breakdowns: ReelBreakdown[] = partials.map((p) => {
    const gpt = individual.find((g) => g.reelId === p.reelId)
    return {
      ...p,
      hook:             gpt?.hook             ?? '',
      body:             gpt?.body             ?? '',
      cta:              gpt?.cta              ?? '',
      hookType:         gpt?.hookType         ?? 'Other',
      emotionalTrigger: gpt?.emotionalTrigger ?? 'Curiosity',
    }
  })

  const result: AnalysisResult = {
    analysedAt: new Date().toISOString(),
    totalReels: breakdowns.length,
    breakdowns,
    patterns: patterns ?? {
      topHookTypes: [], topCTAFormats: [], commonBodyStructure: '',
      bestPerformingPattern: '', weaknesses: [], recommendations: [],
      winningFormula: '', avgEngagementByHookType: {},
    },
    ...(competitorInsights?.length ? { competitorInsights } : {}),
  }
  writeCache('analysis.json', result)
  return result
}
