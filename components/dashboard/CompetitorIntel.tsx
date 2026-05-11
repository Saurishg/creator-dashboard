'use client'

import { motion } from 'framer-motion'
import { competitors as dummyCompetitors } from '@/lib/dummy-data'
import type { DashboardCompetitor } from '@/lib/transform'

export default function CompetitorIntel({ competitors }: { competitors?: DashboardCompetitor[] }) {
  const comps = competitors?.length ? competitors : dummyCompetitors
  const isLive = !!competitors?.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}
      style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>🔍 Competitor Intel</div>
          {isLive
            ? <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '1px 6px', borderRadius: 99 }}>🟢 Live</span>
            : <span style={{ fontSize: 10, color: '#64748b' }}>Demo</span>
          }
        </div>
      </div>

      {comps.map((c) => (
        <div
          key={c.handle}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: 14, background: '#131d35',
            border: '1px solid #1c2a47', borderRadius: 8,
            marginBottom: 10, cursor: 'pointer', transition: 'all .2s',
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
            {c.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.handle}</div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>{c.followers} followers · {c.engRate} eng rate</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>{c.topViews}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>top reel views</div>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 11.5, color: '#a5b4fc', background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.15)', borderRadius: 8, padding: '10px 12px', marginTop: 4, lineHeight: 1.5 }}>
        💡 Go to <strong style={{ color: '#6366f1' }}>🧠 Content DNA</strong> to see full hook/body/CTA breakdown and what to post next.
      </div>
    </motion.div>
  )
}
