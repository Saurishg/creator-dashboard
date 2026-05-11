'use client'

import { motion } from 'framer-motion'
import { trendingAudio as dummyAudio } from '@/lib/dummy-data'
import type { DashboardAudio } from '@/lib/transform'

const WAVE_HEIGHTS = [10, 20, 14, 22, 12, 18, 8]

function WaveBar({ height, delay }: { height: number; delay: number }) {
  return (
    <div
      style={{
        width: 3, height, borderRadius: 99, background: '#8b5cf6',
        animation: `wave 1s ease-in-out ${delay}s infinite`,
        transformOrigin: 'center',
      }}
    />
  )
}

export default function TrendingAudio({ tracks: liveTracks }: { tracks?: DashboardAudio[] }) {
  const tracks: DashboardAudio[] = liveTracks?.length ? liveTracks : dummyAudio
  const isLive = !!liveTracks?.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}
      style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>🎵 Trending Audio — Right Now</div>
          {isLive && (
            <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '1px 6px', borderRadius: 99 }}>
              🟢 Niche
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {isLive ? 'From your niche' : 'Sync competitors to get live audio'}
        </div>
      </div>

      {tracks.map((audio, ai) => (
        <div
          key={audio.name}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, background: '#131d35',
            border: '1px solid #1c2a47', borderRadius: 8,
            marginBottom: ai < tracks.length - 1 ? 8 : 0,
            cursor: 'pointer', transition: 'all .2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
            {WAVE_HEIGHTS.map((h, i) => (
              <WaveBar key={i} height={h} delay={audio.delays[i] ?? 0} />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{audio.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{audio.sub}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: audio.badgeColor }}>{audio.badge}</div>
        </div>
      ))}

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, cursor: 'pointer' }}>
          View all trending audio →
        </div>
      </div>
    </motion.div>
  )
}
