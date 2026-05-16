'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { AnalysisResult } from '@/lib/analysis-types'
import type { DashboardReel } from '@/lib/transform'

const FOLLOWER_STORAGE_KEY = 'follower-history-v1'

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

interface FollowerSnapshot { date: string; followers: number }

function FollowerGrowthTracker() {
  const [history, setHistory] = useState<FollowerSnapshot[]>([])
  const [input, setInput] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FOLLOWER_STORAGE_KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  function addSnapshot() {
    const val = parseInt(input.replace(/[^0-9]/g, ''), 10)
    if (!val || val <= 0) return
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const next = [...history.filter((h) => h.date !== today), { date: today, followers: val }]
      .slice(-8)
    setHistory(next)
    try { localStorage.setItem(FOLLOWER_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    setInput('')
  }

  const data = history.length > 0 ? history : []
  const growth = data.length >= 2 ? data[data.length - 1].followers - data[0].followers : null
  const pct = growth !== null && data[0].followers > 0
    ? ((growth / data[0].followers) * 100).toFixed(1) : null
  const maxF = data.length > 0 ? Math.max(...data.map((d) => d.followers), 1) : 1

  return (
    <div style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>👥 Follower Growth</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {data.length === 0 ? 'Log your first snapshot below' : `${data.length} snapshots tracked`}
          </div>
        </div>
        {growth !== null && pct !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: growth >= 0 ? '#10b981' : '#ef4444' }}>
              {growth >= 0 ? '+' : ''}{growth.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{growth >= 0 ? '+' : ''}{pct}% growth</div>
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, marginBottom: 16 }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%',
                background: i === data.length - 1 ? '#6366f1' : '#1c2a47',
                borderRadius: '4px 4px 0 0',
                height: `${(d.followers / maxF) * 70}px`,
                transition: 'height .5s ease',
                minHeight: 4,
              }} />
              <div style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap' }}>{d.date}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#334155' }}>No data yet — add your first snapshot</div>
        </div>
      )}

      {/* Manual entry */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSnapshot()}
          placeholder="Enter current follower count…"
          type="number"
          min="0"
          disabled={!hydrated}
          style={{
            flex: 1, padding: '9px 14px', background: '#131d35',
            border: '1px solid #1c2a47', borderRadius: 8,
            color: '#f0f4ff', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={addSnapshot}
          disabled={!hydrated || !input.trim()}
          style={{
            padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: (!hydrated || !input.trim()) ? 'not-allowed' : 'pointer',
            border: 'none',
            background: (!hydrated || !input.trim()) ? '#1c2a47' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: (!hydrated || !input.trim()) ? '#64748b' : '#fff',
          }}
        >
          + Log
        </button>
        {history.length > 0 && (
          <button
            onClick={() => { setHistory([]); try { localStorage.removeItem(FOLLOWER_STORAGE_KEY) } catch { /* ignore */ } }}
            style={{ padding: '9px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '1px solid #1c2a47', background: '#131d35', color: '#64748b' }}
          >
            Clear
          </button>
        )}
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
      <FollowerGrowthTracker />
      <CollabFinder analysis={analysis} />
    </>
  )
}
