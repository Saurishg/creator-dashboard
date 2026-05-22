import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'))

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { readCache, writeCache } = await import('../lib/cache.ts')
const { computeStats } = await import('../lib/transform.ts')

const cached = readCache('profile-reels.json')
if (!cached?.reels?.length) { console.error('No reels in cache'); process.exit(1) }

const newStats = computeStats(cached.reels)
writeCache('profile-reels.json', { ...cached, stats: newStats })
console.log('Stats recomputed:')
console.log('  bestPostingTime:', newStats.bestPostingTime)
console.log('  avgViews:', newStats.avgViews)
console.log('  engagementRate:', newStats.engagementRate)
console.log('  totalReels:', newStats.totalReels)
