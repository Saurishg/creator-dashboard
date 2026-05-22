#!/usr/bin/env node
// Run via: cd /home/work/creator-dashboard && npx tsx scripts/run-full-analysis.mjs
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manually load .env.local before any other imports
const envPath = resolve(import.meta.dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
}

const { runAnalysisJob } = await import('../lib/jobs.ts')

const user = process.env.OWN_INSTAGRAM_USERNAME
const limit = process.env.OWN_REELS_LIMIT
console.log(`Starting full analysis of @${user} (limit: ${limit} posts)\n`)

try {
  const summary = await runAnalysisJob({}, (event) => {
    const filled = Math.round(event.progress / 5)
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled)
    process.stdout.write(`\r[${bar}] ${event.progress}%  ${event.step.padEnd(60)}`)
  })
  console.log('\n\n✓ Done!')
  console.log(`  Posts scraped : ${summary.reels}`)
  console.log(`  Posts analysed: ${summary.analysed}`)
} catch (err) {
  console.error('\nFailed:', err.message)
  process.exit(1)
}
