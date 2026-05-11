'use client'

import { motion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'
import { useCounter } from '@/hooks/useCounter'
import { creatorScore } from '@/lib/dummy-data'
import { useIsMobile } from '@/hooks/useIsMobile'

const CIRCUMFERENCE = 2 * Math.PI * 70  // ≈ 440

const barColorMap: Record<string, string> = {
  green:  'linear-gradient(90deg,#10b981,#34d399)',
  red:    'linear-gradient(90deg,#ef4444,#f87171)',
  amber:  'linear-gradient(90deg,#f59e0b,#fcd34d)',
  indigo: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
}

const badgeStyleMap: Record<string, React.CSSProperties> = {
  Strong:  { background: 'rgba(16,185,129,.12)', color: '#10b981' },
  Weak:    { background: 'rgba(239,68,68,.12)',  color: '#ef4444' },
  Average: { background: 'rgba(245,158,11,.12)', color: '#f59e0b' },
}

export default function CreatorScore() {
  const scoreControls = useAnimationControls()
  const score = useCounter(creatorScore.score, 1800, 300)
  const isMobile = useIsMobile()

  useEffect(() => {
    const offset = CIRCUMFERENCE - (creatorScore.score / 100) * CIRCUMFERENCE
    setTimeout(() => {
      scoreControls.start({ strokeDashoffset: offset, transition: { duration: 1.8, ease: [0.22, 1, 0.36, 1] } })
    }, 300)
  }, [scoreControls])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}
      style={{
        background: '#0f1629',
        border: '1px solid #1c2a47',
        borderRadius: 14,
        padding: 28,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        gap: 36,
      }}
    >
      {/* Score ring */}
      <div style={{ position: 'relative', width: isMobile ? 130 : 160, height: isMobile ? 130 : 160, flexShrink: 0 }}>
        <svg
          viewBox="0 0 160 160"
          width={isMobile ? 130 : 160}
          height={isMobile ? 130 : 160}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <defs>
            <linearGradient id="scoreGradLocal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle fill="none" stroke="#1c2a47" strokeWidth={10} cx={80} cy={80} r={70} />
          <motion.circle
            fill="none"
            strokeWidth={10}
            stroke="url(#scoreGradLocal)"
            strokeLinecap="round"
            cx={80}
            cy={80}
            r={70}
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={scoreControls}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1,
              background: 'linear-gradient(135deg,#a5b4fc,#c4b5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {score}
          </div>
          <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/100</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              fontWeight: 700,
              color: '#f59e0b',
              background: 'rgba(245,158,11,.1)',
              border: '1px solid rgba(245,158,11,.2)',
              borderRadius: 99,
              padding: '2px 10px',
            }}
          >
            B+
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 4 }}>
          Your Creator Score
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          {creatorScore.subtitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {creatorScore.metrics.map((m, i) => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: '#94a3b8',
                  fontWeight: 500,
                }}
              >
                <span>{m.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#94a3b8' }}>{m.value}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 99,
                      ...badgeStyleMap[m.badge],
                    }}
                  >
                    {m.badge}
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 6,
                  background: '#1c2a47',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${m.pct}%` }}
                  transition={{ duration: 1.4, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: '100%',
                    borderRadius: 99,
                    background: barColorMap[m.color],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
