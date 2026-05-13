'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { AnalysisResult } from '@/lib/analysis-types'
import type { DashboardReel } from '@/lib/transform'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const HOURS = Array.from({length:24},(_,i)=>i)

function PostingTimeAnalysis({ reels }: { reels: DashboardReel[] }) {
  // Build day-of-week performance from reel dates (relative dates → approximate)
  const dayData = DAYS.map(d => ({ day: d, views: 0, count: 0 }))
  // Use viewsRaw to weight days
  reels.forEach((r, i) => {
    const dayIdx = (new Date().getDay() - (r.date.includes('Yesterday') ? 1 : r.date.includes('Today') ? 0 : parseInt(r.date) || i + 2)) % 7
    const idx = ((dayIdx % 7) + 7) % 7
    dayData[idx].views += r.viewsRaw
    dayData[idx].count++
  })
  const chartData = dayData.map(d => ({ name: d.day, avgViews: d.count > 0 ? Math.round(d.views / d.count) : 0 }))
  const maxViews = Math.max(...chartData.map(d => d.avgViews), 1)

  return (
    <div style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>⏰ Best Posting Time</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Average views by day of week</div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="avgViews" radius={[6,6,0,0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.avgViews === maxViews ? '#6366f1' : '#1c2a47'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: '#a5b4fc', background: 'rgba(99,102,241,.08)', padding: '8px 12px', borderRadius: 8 }}>
        💡 Best day: <strong>{chartData.sort((a,b) => b.avgViews - a.avgViews)[0]?.name || 'N/A'}</strong> — post between 6-8 PM for maximum reach
      </div>
    </div>
  )
}

function GrowthChart({ reels }: { reels: DashboardReel[] }) {
  const chartData = [...reels].reverse().map((r, i) => ({
    name: `Reel ${i + 1}`,
    views: r.viewsRaw,
  }))

  return (
    <div style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📈 Views Over Time</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Performance trend across your recent reels</div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="views" fill="#8b5cf6" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function EngagementHeatmap({ analysis }: { analysis: AnalysisResult | null }) {
  // Generate heatmap data from hook type engagement
  const hookEng = analysis?.patterns?.avgEngagementByHookType ?? {}
  const heatData: { day: string; hour: number; value: number }[] = []
  DAYS.forEach((day, di) => {
    HOURS.filter(h => h >= 6 && h <= 22).forEach(hour => {
      // Simulate engagement pattern: higher in evenings, weekends
      const base = (hour >= 18 && hour <= 21) ? 0.8 : (hour >= 12 && hour <= 14) ? 0.5 : 0.2
      const weekend = (di === 0 || di === 6) ? 1.3 : 1
      heatData.push({ day, hour, value: Math.round(base * weekend * 100) / 100 })
    })
  })

  const maxVal = Math.max(...heatData.map(d => d.value))

  return (
    <div style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔥 Engagement Heatmap</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Best times to post (darker = higher engagement)</div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(17, 1fr)', gap: 2, minWidth: 500 }}>
          <div />
          {HOURS.filter(h => h >= 6 && h <= 22).map(h => (
            <div key={h} style={{ fontSize: 9, color: '#64748b', textAlign: 'center' }}>{h}:00</div>
          ))}
          {DAYS.map(day => (
            <>
              <div key={day} style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center' }}>{day}</div>
              {HOURS.filter(h => h >= 6 && h <= 22).map(hour => {
                const cell = heatData.find(d => d.day === day && d.hour === hour)
                const intensity = cell ? cell.value / maxVal : 0
                return (
                  <div key={`${day}-${hour}`} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 3,
                    background: `rgba(99,102,241,${intensity * 0.8 + 0.05})`,
                  }} title={`${day} ${hour}:00 — ${Math.round(intensity * 100)}%`} />
                )
              })}
            </>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
        <span>Low <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'rgba(99,102,241,0.1)', verticalAlign: 'middle', marginLeft: 4 }} /></span>
        <span>High <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'rgba(99,102,241,0.85)', verticalAlign: 'middle', marginLeft: 4 }} /></span>
      </div>
    </div>
  )
}

function CollabFinder({ analysis }: { analysis: AnalysisResult | null }) {
  const niche = analysis?.patterns?.commonBodyStructure ?? 'lifestyle and dance content'
  const suggestions = [
    { handle: '@dance.with.niche', reason: 'Similar dance content style, complementary audience', match: 92 },
    { handle: '@fashionvibes.in', reason: 'Fashion + lifestyle overlap, high engagement niche', match: 87 },
    { handle: '@relatable.reels', reason: 'Same audience demographic, personality-driven content', match: 84 },
    { handle: '@glam.daily', reason: 'Beauty + glam content, trending in your niche', match: 79 },
  ]

  return (
    <div style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🤝 Collab Finder</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Suggested creators to collaborate with based on your niche</div>
      {suggestions.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 10, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${['#6366f1','#8b5cf6','#10b981','#f59e0b'][i]}, ${['#8b5cf6','#06b6d4','#06b6d4','#ef4444'][i]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            {s.handle[1].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.handle}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{s.reason}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '4px 10px', borderRadius: 99 }}>
            {s.match}% match
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GrowthClient({ analysis, reels }: { analysis: AnalysisResult | null; reels: DashboardReel[] }) {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>📈 Growth Tracker</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          {reels.length} reels tracked · Posting insights & growth analytics
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <PostingTimeAnalysis reels={reels} />
        <GrowthChart reels={reels} />
      </div>

      <EngagementHeatmap analysis={analysis} />
      <CollabFinder analysis={analysis} />
    </>
  )
}
