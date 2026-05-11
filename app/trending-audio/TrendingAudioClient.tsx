'use client'

import { motion } from 'framer-motion'
import type { DashboardAudio } from '@/lib/transform'

const WAVE_HEIGHTS = [10, 20, 14, 22, 12, 18, 8]

export default function TrendingAudioClient({ audio }: { audio: DashboardAudio[] }) {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>🎵 Trending Audio</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Updated 1 hour ago · {audio.length} tracks</p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {audio.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 18,
              background: '#0f1629',
              border: '1px solid #1c2a47',
              borderRadius: 14,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 32 }}>
              {WAVE_HEIGHTS.map((h, wi) => (
                <div
                  key={wi}
                  style={{
                    width: 4,
                    height: h,
                    borderRadius: 99,
                    background: '#8b5cf6',
                    animation: `wave 1s ease-in-out ${item.delays[wi]}s infinite`,
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{item.sub}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: item.badgeColor }}>{item.badge}</div>
          </motion.div>
        ))}
      </div>
    </>
  )
}
