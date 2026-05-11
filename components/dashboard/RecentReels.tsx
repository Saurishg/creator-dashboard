'use client'

import { motion } from 'framer-motion'
import type { ReelType } from '@/lib/transform'
import { recentReels as dummyReels } from '@/lib/dummy-data'
import type { DashboardReel } from '@/lib/transform'
import { useIsMobile } from '@/hooks/useIsMobile'

const typeStyle: Record<ReelType | 'Other', React.CSSProperties> = {
  Educational:    { background: 'rgba(99,102,241,.12)', color: '#a5b4fc' },
  Lifestyle:      { background: 'rgba(6,182,212,.12)',  color: '#06b6d4' },
  'Behind Scenes':{ background: 'rgba(245,158,11,.12)', color: '#f59e0b' },
  Story:          { background: 'rgba(16,185,129,.12)', color: '#10b981' },
  Other:          { background: 'rgba(100,116,139,.12)',color: '#94a3b8' },
}

const barColorMap: Record<string, string> = {
  green:  'linear-gradient(90deg,#10b981,#34d399)',
  amber:  'linear-gradient(90deg,#f59e0b,#fcd34d)',
  indigo: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
}

function ReelRow({ reel, index }: { reel: DashboardReel; index: number }) {
  const isMobile = useIsMobile()

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: 14,
        background: reel.isBest ? 'rgba(99,102,241,.04)' : '#131d35',
        border: reel.isBest ? '1px solid rgba(99,102,241,.3)' : '1px solid #1c2a47',
        borderRadius: 8, marginBottom: index < 4 ? 8 : 0,
        cursor: 'pointer', transition: 'all .2s',
      }}
    >
      <div style={{ width: 44, height: 56, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: reel.thumbGradient }}>
        {reel.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, marginBottom: 4,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 8 : 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {reel.title}
        </div>
        <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: 0.3, ...typeStyle[reel.type as ReelType | 'Other'] }}>
            {reel.type}
          </span>
          <span>{reel.date}</span>
          <span>&#10084;&#65039; {reel.likes}</span>
          <span>&#128172; {reel.comments}</span>
        </div>
      </div>
      <div style={{ width: 80 }}>
        <div style={{ fontSize: 10, color: reel.isBest ? '#6366f1' : '#64748b', marginBottom: 4, textAlign: 'right' }}>
          {reel.isBest ? '🏆 Best' : 'vs avg'}
        </div>
        <div style={{ height: 4, background: '#1c2a47', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${reel.perfPct}%` }}
            transition={{ duration: 1.2, delay: 0.6 + index * 0.1, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: barColorMap[reel.perfColor] ?? barColorMap.green }}
          />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', color: reel.isBest ? '#a5b4fc' : undefined }}>
          {reel.views}
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>views</div>
      </div>
    </div>
  )
}

export default function RecentReels({ reels }: { reels?: DashboardReel[] }) {
  const displayReels = reels?.length ? reels.slice(0, 5) : (dummyReels as DashboardReel[])
  const isLive = !!reels?.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}
      style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.2px' }}>📹 Recent Reels — Performance</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLive
            ? <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '2px 8px', borderRadius: 99 }}>🟢 Live data</span>
            : <span style={{ fontSize: 11, color: '#64748b' }}>Demo — run setup to load your reels</span>
          }
          <div style={{ fontSize: 12, color: '#64748b' }}>Last {displayReels.length} reels</div>
        </div>
      </div>
      <div style={{ height: 1, background: '#1c2a47', margin: '16px 0' }} />
      {displayReels.map((reel, i) => <ReelRow key={reel.id ?? i} reel={reel} index={i} />)}
    </motion.div>
  )
}
