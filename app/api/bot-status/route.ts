import fs from 'fs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BOT = '/home/work/crypto-trading-bot'
const PM2_LOG = '/home/work/.pm2/logs/btc-live-out.log'

function safeReadJson<T>(path: string): T | null {
  try { return JSON.parse(fs.readFileSync(path, 'utf-8')) as T } catch { return null }
}

export async function GET() {
  const indicators = safeReadJson<Record<string, unknown>>(`${BOT}/indicators.json`)
  const state      = safeReadJson<Record<string, unknown>>(`${BOT}/live_state.json`)
  const pnl        = safeReadJson<Record<string, unknown>[]>(`${BOT}/pnl_log.json`) ?? []

  let recentLogs: string[] = []
  let lastCycleTs: string | null = null
  try {
    const all = fs.readFileSync(PM2_LOG, 'utf-8').split('\n')
    recentLogs = all.slice(-30)
    for (let i = recentLogs.length - 1; i >= 0; i--) {
      const m = recentLogs[i].match(/\[([0-9\-: ]+)\]\s*BTC Live Bot running/)
      if (m) { lastCycleTs = m[1]; break }
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    indicators,
    state,
    pnl,
    recentLogs,
    lastCycleTs,
    hasPosition: !!state?.entry_price,
    fetchedAt: new Date().toISOString(),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
