'use client'

import { motion } from 'framer-motion'
import type { DashboardReel } from '@/lib/transform'

export default function PerformanceAlerts({ reels }: { reels: DashboardReel[] }) {
  if (!reels.length) return null

  const avgViews = reels.reduce((s, r) => s + r.viewsRaw, 0) / reels.length
  const alerts: { type: 'viral' | 'low'; emoji: string; msg: string; color: string }[] = []

  reels.slice(0, 3).forEach(r => {
    if (r.viewsRaw > avgViews * 2.5) {
      alerts.push({ type: 'viral', emoji: '🚀', msg: `"${r.title.slice(1, 40)}..." is going viral — ${r.views} views (${Math.round(r.viewsRaw / avgViews)}× your average)`, color: '#10b981' })
    } else if (r.viewsRaw < avgViews * 0.3 && r.viewsRaw > 0) {
      alerts.push({ type: 'low', emoji: '⚠️', msg: `"${r.title.slice(1, 40)}..." is underperforming — only ${r.views} views. Try a different hook type.`, color: '#f59e0b' })
    }
  })

  if (alerts.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {alerts.map((a, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: `${a.color}11`, border: `1px solid ${a.color}33`, borderRadius: 10 }}>
          <span style={{ fontSize: 18 }}>{a.emoji}</span>
          <span style={{ fontSize: 12.5, color: a.color, fontWeight: 500 }}>{a.msg}</span>
        </motion.div>
      ))}
    </div>
  )
}
