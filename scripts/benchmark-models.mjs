#!/usr/bin/env node
/**
 * Benchmarks every Ollama model on the actual Instagram analysis prompt.
 * Scores each on: JSON validity, schema completeness, content richness, speed.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')

const OLLAMA_BASE = 'http://localhost:11434/v1'

// Models to test (skip embedding + vision-only)
const MODELS = ['phi4:latest', 'gemma4:latest', 'qwen3:14b', 'deepseek-r1:14b', 'gpt-oss:20b']

// Load real reel data
const analysis = JSON.parse(readFileSync(join(DATA_DIR, 'analysis.json'), 'utf-8'))
const profileReels = JSON.parse(readFileSync(join(DATA_DIR, 'profile-reels.json'), 'utf-8'))

const reelsText = profileReels.reels.slice(0, 5).map((r, i) =>
  `REEL ${i + 1}\nTitle: ${r.title}\nViews: ${r.viewsRaw} | Likes: ${r.likes} | Comments: ${r.comments}\nTranscript: (lifestyle reel about daily life and fashion)\n---`
).join('\n\n')

const PROMPT = `You are an expert Instagram content strategist for Indian lifestyle creators.

Analyse these 5 Instagram Reels from @justbeing_ani, a creator focused on Indian lifestyle, relatable day-in-the-life, fashion and beauty.

For EACH reel extract:
- hook: likely opening line based on title/context
- body: core content structure
- cta: likely call-to-action
- hookType: one of "Bold claim"|"Shocking number"|"Question"|"Story opener"|"Warning/Don't"|"Contrarian"|"Social proof"|"Future promise"
- emotionalTrigger: one of "Curiosity"|"FOMO"|"Authority"|"Social proof"|"Aspiration"|"Excitement"

Then analyse ALL reels together:
- topHookTypes: hook types ranked by frequency
- topCTAFormats: top CTA patterns
- commonBodyStructure: repeated structural pattern
- bestPerformingPattern: pattern most correlated with high views
- weaknesses: 3 specific content gaps
- recommendations: 5 specific actionable next steps
- winningFormula: distil as one template e.g. "[Hook] → [proof] → [CTA]"
- avgEngagementByHookType: map each hookType to avg engagement score

Return ONLY valid JSON (no markdown, no explanation):
{"individual":[{"reelId":"1","hook":"...","body":"...","cta":"...","hookType":"...","emotionalTrigger":"..."}],"patterns":{"topHookTypes":[],"topCTAFormats":[],"commonBodyStructure":"...","bestPerformingPattern":"...","weaknesses":[],"recommendations":[],"winningFormula":"...","avgEngagementByHookType":{}}}

Reels:
${reelsText}`

function scoreResult(parsed, elapsed) {
  let score = 0
  const notes = []

  // 1. JSON valid (30 pts)
  if (parsed) {
    score += 30
    notes.push('✓ valid JSON')
  } else {
    notes.push('✗ invalid JSON')
    return { score: 0, notes, grade: 'F' }
  }

  // 2. Schema — individual array (20 pts)
  const ind = parsed.individual ?? []
  if (ind.length >= 3) { score += 20; notes.push(`✓ individual[${ind.length}]`) }
  else if (ind.length > 0) { score += 10; notes.push(`~ individual[${ind.length}]`) }
  else notes.push('✗ no individual array')

  // 3. Patterns object completeness (30 pts)
  const p = parsed.patterns ?? {}
  const fields = ['topHookTypes','topCTAFormats','commonBodyStructure','bestPerformingPattern','weaknesses','recommendations','winningFormula','avgEngagementByHookType']
  const filled = fields.filter(f => {
    const v = p[f]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object' && v !== null) return Object.keys(v).length > 0
    return typeof v === 'string' && v.length > 5
  })
  score += Math.round((filled.length / fields.length) * 30)
  notes.push(`✓ patterns: ${filled.length}/${fields.length} fields filled`)

  // 4. Content richness — winningFormula and weaknesses (15 pts)
  if (typeof p.winningFormula === 'string' && p.winningFormula.length > 20) { score += 8; notes.push('✓ rich winningFormula') }
  if (Array.isArray(p.weaknesses) && p.weaknesses.every(w => typeof w === 'string' && w.length > 15)) { score += 7; notes.push('✓ specific weaknesses') }

  // 5. Speed bonus (5 pts — under 30s gets full marks)
  const speedScore = Math.max(0, Math.round(5 - (elapsed / 30000) * 5))
  score += speedScore
  notes.push(`⏱ ${(elapsed/1000).toFixed(1)}s (speed: ${speedScore}/5)`)

  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D'
  return { score, notes, grade }
}

async function testModel(model) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  Testing: ${model}`)
  console.log('─'.repeat(60))

  const start = Date.now()
  let raw = ''
  let parsed = null
  let error = null

  try {
    const res = await fetch(`${OLLAMA_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ollama' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: PROMPT }],
        temperature: 0.3,
        max_tokens: 4000,
        stream: false,
      }),
      signal: AbortSignal.timeout(180_000),
    })

    if (!res.ok) {
      const t = await res.text()
      throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`)
    }

    const data = await res.json()
    raw = data.choices?.[0]?.message?.content ?? ''

    // Strip thinking blocks and code fences
    const cleaned = raw
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```$/im, '')
      .trim()

    parsed = JSON.parse(cleaned)
  } catch (e) {
    error = e.message
  }

  const elapsed = Date.now() - start
  const { score, notes, grade } = scoreResult(parsed, elapsed)

  console.log(`  Grade: ${grade}  |  Score: ${score}/100`)
  notes.forEach(n => console.log(`    ${n}`))
  if (error) console.log(`    ✗ Error: ${error.slice(0, 120)}`)
  if (parsed?.patterns?.winningFormula) {
    console.log(`\n  Winning Formula: "${parsed.patterns.winningFormula}"`)
  }
  if (Array.isArray(parsed?.patterns?.weaknesses)) {
    console.log('  Weaknesses:')
    parsed.patterns.weaknesses.forEach((w, i) => console.log(`    ${i+1}. ${w}`))
  }

  return { model, score, grade, elapsed, parsed, error }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║        OLLAMA MODEL BENCHMARK — Instagram Analysis       ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`Testing ${MODELS.length} models — max 3 min each\n`)

  const results = []
  for (const model of MODELS) {
    const r = await testModel(model)
    results.push(r)
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score)

  console.log('\n\n╔══════════════════════════════════════════════════════════╗')
  console.log('║                    FINAL RANKING                        ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  results.forEach((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '
    const time = (r.elapsed / 1000).toFixed(1)
    console.log(`${medal} #${i+1} ${r.model.padEnd(20)} Grade: ${r.grade}  Score: ${r.score}/100  Time: ${time}s${r.error ? '  [FAILED]' : ''}`)
  })

  const winner = results[0]
  console.log(`\n🏆 WINNER: ${winner.model}`)
  console.log(`   Score ${winner.score}/100 — set LOCAL_AI_MODEL=${winner.model} in .env.local`)
}

main().catch(console.error)
