#!/usr/bin/env node
/**
 * One-shot migration: recompute the `date` field on cached reels from `dateIso`.
 *
 * Background: an earlier version of `relativeDate()` in lib/transform.ts treated
 * the timestamp as an ISO string. The free Instagram scrapers actually emit
 * Unix-seconds strings (e.g. "1740657201"), which `new Date()` cannot parse,
 * so every cached reel ended up with `date: "NaN weeks ago"`.
 *
 * This script rewrites the `date` field in place using the same logic as the
 * fixed `relativeDate()`. Safe to re-run.
 */
import fs from 'node:fs'
import path from 'node:path'

function relativeDate(iso) {
  if (iso == null || iso === '') return ''
  let ms
  if (typeof iso === 'number') {
    ms = iso < 1e12 ? iso * 1000 : iso
  } else if (/^\d+$/.test(String(iso).trim())) {
    const n = Number(iso)
    ms = n < 1e12 ? n * 1000 : n
  } else {
    ms = new Date(iso).getTime()
  }
  if (!Number.isFinite(ms)) return ''
  const diff = Date.now() - ms
  if (diff < 0) return 'Today'
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''} ago`
}

const file = path.join(process.cwd(), 'data', 'profile-reels.json')
const raw = fs.readFileSync(file, 'utf8')
const data = JSON.parse(raw)
const reels = Array.isArray(data) ? data : data.reels

if (!Array.isArray(reels)) {
  console.error('Unexpected cache shape; expected reels array')
  process.exit(1)
}

let fixed = 0
for (const r of reels) {
  const before = r.date
  const after = relativeDate(r.dateIso)
  if (before !== after) {
    r.date = after
    fixed++
  }
}

const tmp = `${file}.tmp`
fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
fs.renameSync(tmp, file)
console.log(`Updated ${fixed}/${reels.length} reel date strings in ${path.basename(file)}`)
