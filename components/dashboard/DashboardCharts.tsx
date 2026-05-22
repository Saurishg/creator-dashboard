'use client'

import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts'
import type { DashboardReel } from '@/lib/transform'
import { useIsMobile } from '@/hooks/useIsMobile'

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function engagement(r: DashboardReel): number {
  if (r.viewsRaw === 0) return 0
  return parseFloat((((r.likesRaw + r.commentsRaw) / r.viewsRaw) * 100).toFixed(2))
}

function EngagementTrend({ reels }: { reels: DashboardReel[] }) {
  // oldest → newest along the X axis so the line reads left-to-right
  const data = [...reels]
    .filter((r) => r.viewsRaw > 0)
    .sort((a, b) => {
      const at = a.dateIso ? new Date(a.dateIso).getTime() : 0
      const bt = b.dateIso ? new Date(b.dateIso).getTime() : 0
      return at - bt
    })
    .map((r, i) => ({
      name:   `R${i + 1}`,
      views:  r.viewsRaw,
      eng:    engagement(r),
      title:  r.title,
    }))

  if (data.length === 0) {
    return (
      <ChartShell title="📈 Engagement Trend" subtitle="No reels yet — run setup to load data.">
        <EmptyState />
      </ChartShell>
    )
  }

  return (
    <ChartShell title="📈 Engagement Trend" subtitle={`${data.length} reels · likes + comments / views`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#1c2a47" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value, name) => name === 'eng' ? [`${value}%`, 'Engagement'] : [value as number, String(name)]}
          />
          <Line type="monotone" dataKey="eng" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

function TopReels({ reels }: { reels: DashboardReel[] }) {
  const data = [...reels]
    .sort((a, b) => b.viewsRaw - a.viewsRaw)
    .slice(0, 5)
    .map((r) => ({
      name:  r.title.replace(/^"|"$/g, '').slice(0, 28) + (r.title.length > 28 ? '…' : ''),
      views: r.viewsRaw,
      isBest: r.isBest,
    }))

  if (data.length === 0) {
    return (
      <ChartShell title="🏆 Top Reels by Views" subtitle="No reels yet.">
        <EmptyState />
      </ChartShell>
    )
  }

  return (
    <ChartShell title="🏆 Top Reels by Views" subtitle={`Top ${data.length} of ${reels.length}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1c2a47" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatViews} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10.5 }} axisLine={false} tickLine={false} width={140} />
          <Tooltip
            contentStyle={{ background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, fontSize: 12 }}
            formatter={(value) => [formatViews(Number(value)), 'Views']}
          />
          <Bar dataKey="views" radius={[0, 6, 6, 0]}>
            {data.map((row, i) => (
              <Cell key={i} fill={row.isBest ? '#6366f1' : '#8b5cf6'} fillOpacity={row.isBest ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

function ChartShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22 }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 14 }}>{subtitle}</div>
      <div style={{ height: 220 }}>{children}</div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12 }}>
      No data to plot.
    </div>
  )
}

export default function DashboardCharts({ reels }: { reels: DashboardReel[] }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>
      <EngagementTrend reels={reels} />
      <TopReels reels={reels} />
    </div>
  )
}
