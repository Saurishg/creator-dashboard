'use client'

import { motion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'
import { useCounter } from '@/hooks/useCounter'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { AnalysisResult } from '@/lib/analysis-types'
import type { DashboardStats } from '@/lib/transform'

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

function pctBadge(pct: number): 'Strong' | 'Average' | 'Weak' {
  return pct >= 70 ? 'Strong' : pct >= 40 ? 'Average' : 'Weak'
}

function pctColor(pct: number): string {
  return pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'red'
}

function computeScore(analysis: AnalysisResult | null, stats: DashboardStats | null) {
  const engRate = stats?.engagementRate ?? 0
  const hookTypes = analysis?.patterns?.topHookTypes ?? []
  const hookEngMap = analysis?.patterns?.avgEngagementByHookType ?? {}
  const hookEngValues = Object.values(hookEngMap)
  const avgHookEng = hookEngValues.length > 0
    ? hookEngValues.reduce((a, b) => a + b, 0) / hookEngValues.length
    : engRate

  const engPct       = Math.min(Math.round(engRate * 6.25), 100)
  const hookQualPct  = Math.min(Math.round(avgHookEng * 6.25), 100)
  const varietyPct   = Math.min(hookTypes.length * 14, 100)
  const totalReels   = stats?.totalReels ?? 0
  const consPct      = Math.min(Math.round(totalReels * 2.5), 100)
  const hashtagPct   = 62

  const score = Math.round(engPct * 0.35 + hookQualPct * 0.25 + varietyPct * 0.2 + consPct * 0.1 + hashtagPct * 0.1)
  const grade = score >= 90 ? 'A+' : score >= 85 ? 'A' : score >= 80 ? 'B+' : score >= 75 ? 'B' : score >= 70 ? 'C+' : 'C'

  return {
    score,
    grade,
    subtitle: totalReels > 0 ? `Based on ${totalReels} reels · updated live` : 'Run analysis to see your live score',
    metrics: [
      { label: 'Engagement Rate',     value: `${engRate.toFixed(1)}%`,                                        pct: engPct,      color: pctColor(engPct),      badge: pctBadge(engPct)      },
      { label: 'Hook Quality',        value: avgHookEng > 0 ? `${avgHookEng.toFixed(1)}% eng` : '—',          pct: hookQualPct, color: pctColor(hookQualPct), badge: pctBadge(hookQualPct) },
      { label: 'Content Variety',     value: `${hookTypes.length} hook type${hookTypes.length !== 1 ? 's' : ''}`, pct: varietyPct,  color: pctColor(varietyPct),  badge: pctBadge(varietyPct)  },
      { label: 'Posting Consistency', value: `${totalReels} reels`,                                           pct: consPct,     color: pctColor(consPct),     badge: pctBadge(consPct)     },
      { label: 'Hashtag Strategy',    value: '62/100',                                                        pct: hashtagPct,  color: 'amber',               badge: 'Average' as const    },
    ],
  }
}

interface Props {
  analysis: AnalysisResult | null
  stats: DashboardStats | null
}

export default function CreatorScore({ analysis, stats }: Props) {
  const scoreControls = useAnimationControls()
  const { score, grade, subtitle, metrics } = computeScore(analysis, stats)
  const animatedScore = useCounter(score, 1800, 300)
  const isMobile = useIsMobile()

  useEffect(() => {
    const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE
    setTimeout(() => {
      scoreControls.start({ strokeDashoffset: offset, transition: { duration: 1.8, ease: [0.22, 1, 0.36, 1] } })
    }, 300)
  }, [scoreControls, score])

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
            {animatedScore}
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
            {grade}
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 4 }}>
          Your Creator Score
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          {subtitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {metrics.map((m, i) => (
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
