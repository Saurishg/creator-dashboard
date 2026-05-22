import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.chdir('/home/work/creator-dashboard')

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { readCache, writeCache } = await import('../lib/cache.ts')
const { getOpenAI, LOCAL_MODEL } = await import('../lib/openai-client.ts')
const { readCreatorProfile } = await import('../lib/creator-profile.ts')
const { parseJsonObject } = await import('../lib/json.ts')

const analysis = readCache('analysis.json')
const compAnalysis = readCache('competitor-analysis.json')
const profile = readCreatorProfile()

if (!analysis) { console.error('No analysis.json'); process.exit(1) }

const topPatterns = analysis.patterns
const compInsights = compAnalysis?.competitors.map(c =>
  `@${c.handle}: winningFormula="${(c.patterns.winningFormula ?? '').slice(0,80)}" topHooks=${(c.patterns.topHookTypes ?? []).slice(0,2).join(',')}`
).join(' | ') ?? ''

const now = new Date()
const days = Array.from({length: 30}, (_, i) => {
  const d = new Date(now); d.setDate(d.getDate() + i + 1)
  return d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'})
})

const prompt = `You are a content calendar planner for an Instagram creator in ${profile.contentNiche}.

Winning formula: ${topPatterns.winningFormula}
Top hook types: ${(topPatterns.topHookTypes ?? []).slice(0,3).join(', ')}
Top CTAs: ${(topPatterns.topCTAFormats ?? []).slice(0,2).join(', ')}
${compInsights ? `Competitor intelligence: ${compInsights}` : ''}

Generate 30 Instagram posts for days: ${days.join(', ')}.

Return ONLY valid JSON:
{"posts":[{"day":1,"date":"Thu 22 May","hookType":"Story opener","hook":"The moment everything changed for my business...","topic":"Community building","cta":"Comment your experience below"}]}`

const openai = getOpenAI()
console.log('Generating 30-day calendar with phi4...')
const completion = await openai.chat.completions.create({
  model: LOCAL_MODEL,
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
  temperature: 0.7,
  max_tokens: 4000,
})

const result = parseJsonObject(completion.choices[0]?.message?.content ?? '{}', { posts: [] })
const posts = Array.isArray(result.posts) ? result.posts : []
writeCache('calendar.json', { generatedAt: new Date().toISOString(), posts, totalPosts: posts.length })
console.log(`Calendar saved: ${posts.length} posts`)
if (posts[0]) console.log('First post:', JSON.stringify(posts[0]))
