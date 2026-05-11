'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { AnalysisResult } from '@/lib/analysis-types'

export default function InsightBanner({ analysis }: { analysis?: AnalysisResult | null }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const formula = analysis?.patterns?.winningFormula
  const rec = analysis?.patterns?.recommendations?.[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.08))',
        border: '1px solid rgba(99,102,241,.2)',
        borderRadius: 14,
        padding: '18px 22px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 26, flexShrink: 0 }}>🔥</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
          {analysis ? 'Your Winning Formula — from AI Analysis' : 'Today\'s Opportunity — Act Fast'}
        </h3>
        <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
          {formula ? (
            <>
              <strong style={{ color: '#a5b4fc' }}>Formula: </strong>{formula}
              {rec && <><br /><span style={{ color: '#64748b' }}>Next: </span>{rec}</>}
            </>
          ) : (
            <>
              <strong style={{ color: '#a5b4fc' }}>@viral.strategy</strong> posted a reel 4 hrs ago
              using the &quot;3 mistakes&quot; hook — already at 240K views. Your audience loves this
              format. Here&apos;s your angle.
            </>
          )}
        </p>
      </div>
      <div
        onClick={() => router.push('/analysis')}
        style={{
          marginLeft: isMobile ? 0 : 'auto',
          alignSelf: isMobile ? 'flex-start' : undefined,
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          color: '#a5b4fc',
          background: 'rgba(99,102,241,.12)',
          border: '1px solid rgba(99,102,241,.2)',
          padding: '7px 14px',
          borderRadius: 99,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {analysis ? 'View Full DNA →' : 'See My Angle →'}
      </div>
    </motion.div>
  )
}
