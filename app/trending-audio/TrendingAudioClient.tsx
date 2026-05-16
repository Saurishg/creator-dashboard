'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import type { DashboardAudio } from '@/lib/transform'

const WAVE_HEIGHTS = [10, 20, 14, 22, 12, 18, 8]

const BADGE_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  '🔥 Hot':      { label: 'Hot',      color: '#ef4444', bg: 'rgba(239,68,68,.1)'    },
  '📈 Rising':   { label: 'Rising',   color: '#f59e0b', bg: 'rgba(245,158,11,.1)'   },
  '♾️ Stable':   { label: 'Stable',   color: '#06b6d4', bg: 'rgba(6,182,212,.1)'    },
  '🚀 Breakout': { label: 'Breakout', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)'   },
}

export default function TrendingAudioClient({ audio }: { audio: DashboardAudio[] }) {
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('All')

  const categories = ['All', ...Object.values(BADGE_CATEGORIES).map((c) => c.label)]

  const filtered = audio.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const catLabel = BADGE_CATEGORIES[item.badge]?.label ?? ''
    const matchCat = filter === 'All' || catLabel === filter
    return matchSearch && matchCat
  })

  function copyAudioName(name: string) {
    navigator.clipboard.writeText(name).catch(() => {})
    setCopied(name)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>🎵 Trending Audio</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          {audio.length} tracks from your niche · Updated with each analysis run
        </p>
      </motion.div>

      {/* Search + filter row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audio…"
          style={{
            flex: 1, minWidth: 180, padding: '9px 14px',
            background: '#0f1629', border: '1px solid #1c2a47',
            borderRadius: 8, color: '#f0f4ff', fontSize: 13, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1px solid #1c2a47',
                background: filter === cat ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#0f1629',
                color: filter === cat ? '#fff' : '#64748b',
              }}>
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', fontSize: 13 }}>
          No audio matches your search
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((item, i) => {
          const cat = BADGE_CATEGORIES[item.badge]
          const isCopied = copied === item.name
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: 18, background: '#0f1629',
                border: '1px solid #1c2a47', borderRadius: 14,
              }}
            >
              {/* Animated wave */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 32, flexShrink: 0 }}>
                {WAVE_HEIGHTS.map((h, wi) => (
                  <div key={wi} style={{
                    width: 4, height: h, borderRadius: 99,
                    background: cat?.color ?? '#8b5cf6',
                    animation: `wave 1s ease-in-out ${item.delays[wi]}s infinite`,
                    transformOrigin: 'center',
                  }} />
                ))}
              </div>

              {/* Track info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{item.sub}</div>
              </div>

              {/* Category badge */}
              {cat && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                  background: cat.bg, color: cat.color, flexShrink: 0,
                }}>
                  {item.badge}
                </span>
              )}

              {/* Copy button */}
              <button
                onClick={() => copyAudioName(item.name)}
                title="Copy audio name"
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                  cursor: 'pointer', flexShrink: 0,
                  border: isCopied ? '1px solid rgba(16,185,129,.3)' : '1px solid #1c2a47',
                  background: isCopied ? 'rgba(16,185,129,.1)' : '#131d35',
                  color: isCopied ? '#10b981' : '#64748b',
                  transition: 'all .15s',
                }}
              >
                {isCopied ? '✓ Copied' : '📋 Copy'}
              </button>
            </motion.div>
          )
        })}
      </div>

      {audio.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#0f1629', border: '1px dashed #1c2a47', borderRadius: 14, padding: 32, textAlign: 'center', marginTop: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎵</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No trending audio yet</div>
          <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6 }}>
            Run competitor analysis to extract trending tracks from reels in your niche.
          </div>
        </motion.div>
      )}
    </>
  )
}
