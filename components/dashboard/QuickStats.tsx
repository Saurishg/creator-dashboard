'use client'

import { motion } from 'framer-motion'
import { useCounter } from '@/hooks/useCounter'
import { quickStats as dummyStats } from '@/lib/dummy-data'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { DashboardStats } from '@/lib/transform'

function StatCard({
  icon, iconBg, value, staticText, suffix, label, trend, index,
}: {
  icon: string; iconBg: string
  value: number | null; staticText?: string; suffix: string
  label: string; trend: string; index: number
}) {
  const counted = useCounter(value ?? 0, 1600, 100)

  const displayValue = staticText
    ? staticText
    : value !== null
    ? `${value % 1 !== 0 ? counted.toFixed(1) : counted}${suffix}`
    : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 * (index + 1) }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}
      style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 20 }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, marginBottom: 14, background: iconBg }}>
        {icon}
      </div>
      <div style={{ fontSize: staticText ? 20 : 26, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4, paddingTop: staticText ? 4 : 0 }}>
        {displayValue}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{label}</div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: 'rgba(16,185,129,.12)', color: '#10b981' }}>
        {trend}
      </span>
    </motion.div>
  )
}

export default function QuickStats({ liveStats }: { liveStats?: DashboardStats }) {
  const isMobile = useIsMobile()
  const stats = [
    {
      icon: '📹', iconBg: 'rgba(99,102,241,.12)',
      value: liveStats ? liveStats.totalReels : dummyStats[0].value,
      suffix: '', label: 'Total Reels',
      trend: liveStats ? `${liveStats.totalReels} reels scraped` : '↑ 6 this month',
    },
    {
      icon: '👁️', iconBg: 'rgba(16,185,129,.12)',
      value: liveStats ? parseFloat((liveStats.avgViews / 1000).toFixed(1)) : dummyStats[1].value,
      suffix: 'K', label: 'Avg Views / Reel',
      trend: liveStats ? 'from your last reels' : '↑ 18% vs last month',
    },
    {
      icon: '⏰', iconBg: 'rgba(245,158,11,.12)',
      value: null,
      staticText: liveStats ? liveStats.bestPostingTime : 'Tue 7PM',
      suffix: '', label: 'Your Best Posting Time',
      trend: '3.1× more views',
    },
    {
      icon: '💬', iconBg: 'rgba(6,182,212,.12)',
      value: liveStats ? liveStats.engagementRate : dummyStats[3].value,
      suffix: '%', label: 'Engagement Rate',
      trend: liveStats ? 'calculated from reels' : '↑ above avg (3.2%)',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
      {stats.map((stat, i) => (
        <StatCard key={stat.label} {...stat} index={i} />
      ))}
    </div>
  )
}
