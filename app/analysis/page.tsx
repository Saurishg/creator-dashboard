'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { AnalysisResult, ReelBreakdown } from '@/lib/analysis-types'

const HOOK_COLORS: Record<string, string> = {
  'Bold claim':    '#6366f1',
  'Shocking number': '#f59e0b',
  'Question':      '#06b6d4',
  'Story opener':  '#10b981',
  'Warning/Don\'t': '#ef4444',
  'Contrarian':    '#8b5cf6',
  'Social proof':  '#f97316',
  'Future promise':'#84cc16',
}

const TRIGGER_COLORS: Record<string, string> = {
  'Curiosity':    '#8b5cf6',
  'FOMO':         '#ef4444',
  'Authority':    '#6366f1',
  'Social proof': '#10b981',
  'Aspiration':   '#f59e0b',
  'Fear of missing out': '#ef4444',
  'Excitement':   '#06b6d4',
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function ReelCard({ reel, index }: { reel: ReelBreakdown; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const hookColor  = HOOK_COLORS[reel.hookType]    ?? '#64748b'
  const trigColor  = TRIGGER_COLORS[reel.emotionalTrigger] ?? '#64748b'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 20, marginBottom: 14 }}
    >
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${hookColor}22`, color: hookColor }}>
              {reel.hookType}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${trigColor}22`, color: trigColor }}>
              {reel.emotionalTrigger}
            </span>
            <span style={{ fontSize: 10, color: '#64748b' }}>
              👁 {formatViews(reel.views)} · ❤️ {formatViews(reel.likes)} · 💬 {formatViews(reel.comments)}
            </span>
          </div>
          <a
            href={reel.url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: '#a5b4fc', textDecoration: 'none', wordBreak: 'break-word' }}
          >
            {reel.url}
          </a>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 8, padding: '4px 10px', color: '#a5b4fc', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
        >
          {expanded ? 'Collapse ↑' : 'Expand ↓'}
        </button>
      </div>

      {/* hook / body / cta */}
      <div className="grid-3col" style={{ gap: 10 }}>
        {[
          { label: '🎣 Hook', value: reel.hook,  bg: 'rgba(99,102,241,.08)',  border: 'rgba(99,102,241,.2)' },
          { label: '📖 Body', value: reel.body,  bg: 'rgba(16,185,129,.06)',  border: 'rgba(16,185,129,.15)' },
          { label: '📢 CTA',  value: reel.cta,   bg: 'rgba(245,158,11,.06)',  border: 'rgba(245,158,11,.15)' },
        ].map(({ label, value, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>
              {value || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* transcript (collapsed by default) */}
      {expanded && reel.transcript && (
        <div style={{ marginTop: 12, background: '#0a1020', border: '1px solid #1c2a47', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: 0.5 }}>📝 TRANSCRIPT</div>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{reel.transcript}</div>
        </div>
      )}
    </motion.div>
  )
}

function PatternCard({ title, children, color = '#6366f1' }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: '#0f1629', border: `1px solid ${color}33`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

export default function AnalysisPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState('')

  const authHeader = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_AUTH_TOKEN ?? ''}` }

  useEffect(() => {
    fetch('/api/analyze', { headers: authHeader })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: AnalysisResult | null) => {
        if (json?.breakdowns?.length) setResult(json)
      })
      .catch(() => {})
  }, [])

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setStep('Scraping your latest reels from Instagram…')
    try {
      setStep('Downloading videos and transcribing with Whisper medium…')
      const res = await fetch('/api/analyze', { method: 'POST', headers: authHeader })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Analysis failed')
      } else {
        const full = await fetch('/api/analyze', { headers: authHeader })
        if (full.ok) setResult(await full.json() as AnalysisResult)
        else setResult(json as AnalysisResult)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  async function rerun() {
    setResult(null)
    setLoading(true)
    setError(null)
    setStep('Re-scraping and re-transcribing…')
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: authHeader })
      const json = await res.json()
      if (!res.ok || json.error) setError(json.error ?? 'Failed')
      else {
        const full = await fetch('/api/analyze', { headers: authHeader })
        if (full.ok) {
          const fullJson: AnalysisResult = await full.json()
          setResult(fullJson)
        } else {
          setResult(json as AnalysisResult)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  const p = result?.patterns

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          🧠 Content DNA Analyser
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Whisper medium transcribes every reel · phi4 breaks down hook / body / CTA · Pattern mining finds your winning formula
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!result && (
            <button
              onClick={runAnalysis}
              disabled={loading}
              style={{
                background: loading ? 'rgba(99,102,241,.1)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', borderRadius: 10, padding: '10px 22px',
                color: loading ? '#64748b' : '#fff', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? `⏳ ${step || 'Working…'}` : '🚀 Run Full Analysis'}
            </button>
          )}
          {result && (
            <>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Analysed {result.totalReels} reels · {new Date(result.analysedAt).toLocaleString()}
              </div>
              <button
                onClick={rerun}
                disabled={loading}
                style={{ background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 8, padding: '6px 14px', color: '#a5b4fc', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {loading ? '⏳ Re-running…' : '🔄 Re-run Fresh'}
              </button>
            </>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 10, fontSize: 12, color: '#f87171' }}>
            ⚠️ {error}
          </div>
        )}
      </motion.div>

      {/* results */}
      {result && p && (
        <>
          {/* Winning Formula — hero card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1))',
              border: '1px solid rgba(99,102,241,.4)',
              borderRadius: 16, padding: 24, marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: 1, marginBottom: 8 }}>🏆 YOUR WINNING FORMULA</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.6 }}>{p.winningFormula}</div>
          </motion.div>

          {/* Pattern grid */}
          <div className="grid-2col" style={{ gap: 14, marginBottom: 20 }}>
            <PatternCard title="🎣 Top Hook Types (by performance)" color="#6366f1">
              {p.topHookTypes.map((h, i) => (
                <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', width: 18 }}>#{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: `${HOOK_COLORS[h] ?? '#6366f1'}22`, color: HOOK_COLORS[h] ?? '#a5b4fc' }}>
                    {h}
                  </span>
                  {p.avgEngagementByHookType?.[h] !== undefined && (
                    <span style={{ fontSize: 11, color: '#64748b' }}>{p.avgEngagementByHookType[h].toFixed(1)}% eng</span>
                  )}
                </div>
              ))}
            </PatternCard>

            <PatternCard title="📢 Top CTA Formats" color="#10b981">
              {p.topCTAFormats.map((cta, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#10b981', flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0' }}>{cta}</span>
                </div>
              ))}
            </PatternCard>

            <PatternCard title="📖 Common Body Structure" color="#06b6d4">
              <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>{p.commonBodyStructure}</div>
            </PatternCard>

            <PatternCard title="⚡ Best Performing Pattern" color="#f59e0b">
              <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 }}>{p.bestPerformingPattern}</div>
            </PatternCard>
          </div>

          {/* Weaknesses + Recommendations */}
          <div className="grid-2col" style={{ gap: 14, marginBottom: 24 }}>
            <PatternCard title="⚠️ Content Gaps (what you're missing)" color="#ef4444">
              {p.weaknesses.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#ef4444', flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{w}</span>
                </div>
              ))}
            </PatternCard>

            <PatternCard title="✅ What You Should Do Next" color="#10b981">
              {p.recommendations.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }}>{r}</span>
                </div>
              ))}
            </PatternCard>
          </div>

          {/* Individual reel breakdowns */}
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>
            📋 Reel-by-Reel Breakdown ({result.breakdowns.length} reels)
          </div>
          {result.breakdowns
            .sort((a, b) => b.views - a.views)
            .map((reel, i) => (
              <ReelCard key={reel.reelId} reel={reel} index={i} />
            ))
          }
        </>
      )}

      {/* empty state */}
      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🧬</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#94a3b8' }}>No analysis yet</div>
          <div style={{ fontSize: 12 }}>Hit <strong style={{ color: '#a5b4fc' }}>Run Full Analysis</strong> — it takes ~2 minutes to transcribe and analyse all your reels.</div>
        </div>
      )}
    </div>
  )
}
