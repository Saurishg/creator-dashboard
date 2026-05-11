'use client'

import { motion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'
import { useCounter } from '@/hooks/useCounter'
import { nextReelIdea as dummyIdea } from '@/lib/dummy-data'
import type { AnalysisResult } from '@/lib/analysis-types'

const VIRAL_CIRC = 2 * Math.PI * 22 // ≈ 138

function buildIdeaFromAnalysis(analysis: AnalysisResult) {
  const p = analysis.patterns
  const topHook = p.topHookTypes?.[0] ?? 'Bold claim'
  const topCta = p.topCTAFormats?.[0] ?? 'comment X for Y'
  const rec = p.recommendations?.[0] ?? p.bestPerformingPattern

  return {
    viralScore: 88,
    hook: `"${topHook} hook + ${topCta} CTA — your highest-performing pattern"`,
    why: `🎯 Based on ${analysis.totalReels} reels analysed. ${p.winningFormula ?? ''} ${rec ? `Next action: ${rec}` : ''}`.trim(),
    tags: [
      { dot: '#8b5cf6', label: `Hook: ${topHook}` },
      { dot: '#10b981', label: `CTA: ${topCta}` },
      { dot: '#06b6d4', label: p.commonBodyStructure?.split(' ').slice(0, 4).join(' ') || 'Story format' },
    ],
  }
}

export default function NextReelIdea({ analysis }: { analysis?: AnalysisResult | null }) {
  const idea = analysis?.patterns ? buildIdeaFromAnalysis(analysis) : dummyIdea
  const viralControls = useAnimationControls()
  const viralScore = useCounter(idea.viralScore, 2000, 500)

  useEffect(() => {
    const offset = VIRAL_CIRC - (idea.viralScore / 100) * VIRAL_CIRC
    setTimeout(() => {
      viralControls.start({
        strokeDashoffset: offset,
        transition: { duration: 2, ease: [0.22, 1, 0.36, 1] },
      })
    }, 500)
  }, [viralControls, idea.viralScore])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      style={{
        background: 'linear-gradient(#0f1629, #0f1629) padding-box, linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4) border-box',
        border: '1px solid transparent',
        borderRadius: 14,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#a5b4fc' }}>
            ⚡ Next Reel Idea
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            {analysis ? `From ${analysis.totalReels} reels analysed` : 'Generated from your data + competitor patterns'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
              VIRAL SCORE
            </div>
          </div>
          <div style={{ width: 52, height: 52, position: 'relative' }}>
            <svg
              viewBox="0 0 52 52"
              width={52}
              height={52}
              style={{ transform: 'rotate(-90deg)' }}
            >
              <defs>
                <linearGradient id="viralGradLocal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <circle fill="none" stroke="#1c2a47" strokeWidth={5} cx={26} cy={26} r={22} />
              <motion.circle
                fill="none"
                strokeWidth={5}
                stroke="url(#viralGradLocal)"
                strokeLinecap="round"
                cx={26}
                cy={26}
                r={22}
                strokeDasharray={VIRAL_CIRC}
                initial={{ strokeDashoffset: VIRAL_CIRC }}
                animate={viralControls}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 900,
                background: 'linear-gradient(135deg,#a5b4fc,#c4b5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {viralScore}
            </div>
          </div>
        </div>
      </div>

      {/* Hook */}
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.45, marginBottom: 14 }}>
        {idea.hook}
      </div>

      {/* Why */}
      <div
        style={{
          fontSize: 12.5,
          color: '#94a3b8',
          lineHeight: 1.6,
          marginBottom: 18,
          padding: 12,
          background: 'rgba(255,255,255,.03)',
          borderRadius: 8,
          border: '1px solid #1c2a47',
        }}
      >
        {idea.why}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
        {idea.tags.map((tag) => (
          <div
            key={tag.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 99,
              background: '#131d35',
              border: '1px solid #1c2a47',
              color: '#94a3b8',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: tag.dot,
              }}
            />
            {tag.label}
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        style={{
          width: '100%',
          padding: 12,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff',
          fontSize: 13.5,
          fontWeight: 700,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          boxShadow: '0 4px 20px rgba(99,102,241,.3)',
          transition: 'all .25s',
        }}
      >
        ⚡ Use This Idea &amp; Plan Post
      </button>
    </motion.div>
  )
}
