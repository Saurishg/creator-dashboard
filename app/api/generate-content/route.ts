import { getOpenAI, LOCAL_MODEL } from '@/lib/openai-client'
import { readCache } from '@/lib/cache'
import { readCreatorProfile } from '@/lib/creator-profile'
import { requireApiAuth } from '@/lib/auth'
import { parseJsonObject } from '@/lib/json'
import { NextResponse } from 'next/server'
import type { AnalysisResult } from '@/lib/analysis-types'

export async function POST(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth

  const body = await req.json().catch(() => ({})) as { topic?: string; type?: 'hashtags' | 'caption' }
  const type = body.type ?? 'hashtags'
  const topic = (body.topic ?? '').slice(0, 200).replace(/[<>]/g, '')

  const profile = readCreatorProfile()
  const analysis = readCache<AnalysisResult>('analysis.json')
  const openai = getOpenAI()

  const prompt = type === 'hashtags'
    ? `Generate 20 Instagram hashtags for a ${profile.contentNiche} creator (@${profile.username}). Topic: "${topic || 'general content'}". Mix popular (1M+), medium (100K-1M), and niche (<100K) hashtags. Return JSON: {"hashtags":["#tag1","#tag2"],"categories":{"popular":[],"medium":[],"niche":[]}}`
    : `Write 3 Instagram captions for a ${profile.contentNiche} creator. Style: ${profile.languageStyle}. Topic: "${topic}". Each caption should have a hook, body, and CTA. Return JSON: {"captions":[{"text":"full caption","hook":"opening line","mood":"emoji"}]}`

  const completion = await openai.chat.completions.create({
    model: LOCAL_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2000,
  })

  const result = parseJsonObject(completion.choices[0]?.message?.content ?? '{}', {})
  return NextResponse.json(result)
}
