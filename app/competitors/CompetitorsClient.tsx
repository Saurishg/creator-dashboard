'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { DashboardCompetitor } from '@/lib/transform'
import type { CompetitorAnalysisResult } from '@/lib/analysis-types'

const GRADIENTS = [
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
]

export default function CompetitorsClient({
  competitors,
  isLive,
  compAnalysis,
}: {
  competitors: DashboardCompetitor[]
  isLive: boolean
  compAnalysis?: CompetitorAnalysisResult
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filled = competitors.map((c, i) => ({ ...c, gradient: c.gradient || GRADIENTS[i % GRADIENTS.length] }))

  async function runAnalysis() {
    setRunning(true)
    setProgress(2)
    setStatusMsg('Starting competitor analysis…')
    try {
      const res = await fetch('/api/analyse-competitors', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_AUTH_TOKEN ?? ''}` },
      })
      if (!res.ok) {
        const errText = await res.text()
        setError(errText || `Error ${res.status}`)
        setRunning(false)
        return
      }
      if (!res.body) { setError('Stream error'); setRunning(false); return }
      const reader = res.body.getReader()
      const dec = new TextDecoder('utf-8')
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const msg = JSON.parse(line.slice(6))
            if (msg.step) setStatusMsg(msg.step)
            if (msg.progress) setProgress(msg.progress)
            if (msg.error) { setError(msg.error); setRunning(false); return }
            if (msg.done) { router.refresh(); setRunning(false) }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setStatusMsg('Error — check console')
      setRunning(false)
    }
  }

  return (
    <>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 32, gap: isMobile ? 12 : 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>🔍 Competitor Intel</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Tracking {filled.length} competitors
            {isLive
              ? <span style={{ marginLeft: 8, color: '#10b981', fontSize: 11, background: 'rgba(16,185,129,.1)', padding: '1px 6px', borderRadius: 99 }}>🟢 Live</span>
              : <span style={{ marginLeft: 8, color: '#64748b', fontSize: 11 }}>Demo</span>}
            {compAnalysis && <span style={{ marginLeft: 8, color: '#a5b4fc', fontSize: 11, background: 'rgba(99,102,241,.1)', padding: '1px 6px', borderRadius: 99 }}>🧠 AI Analysed</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                const enabled = localStorage.getItem('competitor-alerts') !== 'off'
                localStorage.setItem('competitor-alerts', enabled ? 'off' : 'on')
                alert(enabled ? '🔕 Competitor alerts disabled' : '🔔 Competitor alerts enabled — you\'ll see a banner when a competitor posts a viral reel (>2× their avg views)')
              }
            }}
            style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #1c2a47', background: '#0f1629', color: '#64748b' }}
          >
            🔔 Alerts
          </button>
          <button
            onClick={runAnalysis}
            disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', border: 'none', background: running ? '#1c2a47' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: running ? '#64748b' : '#fff', boxShadow: running ? 'none' : '0 4px 20px rgba(99,102,241,.35)', transition: 'all .2s' }}
          >
            {running ? '⏳ Analysing…' : '🧠 Analyse Competitors'}
          </button>
        </div>
      </motion.div>

      {/* Progress bar */}
      {running && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>{statusMsg}</div>
          <div style={{ height: 6, background: '#1c2a47', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{progress}% complete</div>
        </motion.div>
      )}

      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${filled.length}, 1fr)`, gap: 16, marginBottom: 20 }}>
        {filled.map((c, i) => (
          <motion.div key={c.handle} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{c.initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.handle}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{c.followers} followers</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[{ label: 'Top Reel Views', value: c.topViews }, { label: 'Eng Rate', value: c.engRate }].map((s) => (
                <div key={s.label} style={{ background: '#131d35', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Competitor Analysis */}
      {compAnalysis?.competitors?.length ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>🧠 What's Working for Each Competitor</div>
            <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '1px 6px', borderRadius: 99 }}>Whisper medium + phi4</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {compAnalysis.competitors.map((comp, i) => (
              <div key={comp.handle} style={{ background: '#0a0f1e', border: '1px solid #1c2a47', borderRadius: 12, overflow: 'hidden' }}>
                {/* Competitor header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #1c2a47', background: '#131d35' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: GRADIENTS[i % GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {comp.handle.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>@{comp.handle}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{comp.totalReels} reels transcribed & analysed</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#a5b4fc', background: 'rgba(99,102,241,.1)', padding: '3px 10px', borderRadius: 99 }}>
                    Winning: {comp.patterns.winningFormula?.split('→')[0]?.trim() ?? comp.patterns.bestPerformingPattern?.split('→')[0]?.trim()}
                  </div>
                </div>

                <div style={{ padding: 18 }}>
                  {/* Winning formula */}
                  <div style={{ fontSize: 13, color: '#a5b4fc', background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, lineHeight: 1.5 }}>
                    🏆 <strong>Formula:</strong> {comp.patterns.winningFormula}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Top Hooks</div>
                      {comp.patterns.topHookTypes?.slice(0, 3).map((h) => (
                        <div key={h} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: 'rgba(99,102,241,.12)', color: '#a5b4fc', marginBottom: 4, width: 'fit-content' }}>{h}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Top CTAs</div>
                      {comp.patterns.topCTAFormats?.slice(0, 3).map((c) => (
                        <div key={c} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: 'rgba(16,185,129,.1)', color: '#10b981', marginBottom: 4, width: 'fit-content' }}>{c}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Body Structure</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{comp.patterns.commonBodyStructure}</div>
                    </div>
                  </div>

                  {/* Steal-worthy reels */}
                  {comp.breakdowns.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Top Performing Reels</div>
                      {comp.breakdowns
                        .sort((a, b) => b.views - a.views)
                        .slice(0, 3)
                        .map((reel) => (
                          <div key={reel.reelId} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #1c2a47' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reel.hook || '(no hook extracted)'}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{reel.hookType} · {reel.cta || 'no CTA'}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#a5b4fc' }}>{reel.views > 1000 ? `${(reel.views / 1000).toFixed(0)}K` : reel.views}</div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>views</div>
                            </div>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : !running && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: '#0f1629', border: '1px dashed #1c2a47', borderRadius: 14, padding: 28, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🧠</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No Competitor Analysis Yet</div>
          <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
            Click <strong style={{ color: '#a5b4fc' }}>🧠 Analyse Competitors</strong> above to scrape their reels,<br />transcribe with Whisper, and get a full hook/body/CTA breakdown.
          </div>
        </motion.div>
      )}

      {/* Comparison table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🎣 Steal-Worthy Hooks</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Top-performing hooks from competitors you can adapt</div>
        {compAnalysis?.competitors?.flatMap(c => c.breakdowns.sort((a,b) => b.views - a.views).slice(0,2).map(r => ({...r, handle: c.handle}))).slice(0,6).map((reel, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: '#64748b', flexShrink: 0, width: 80 }}>@{reel.handle}</div>
            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: '#e2e8f0' }}>{reel.hook || '(no hook)'}</div>
            <div style={{ fontSize: 11, color: '#a5b4fc', flexShrink: 0 }}>{reel.views > 1000 ? `${(reel.views/1000).toFixed(0)}K` : reel.views} views</div>
          </div>
        )) ?? <div style={{ fontSize: 12, color: '#64748b' }}>Run competitor analysis to see hooks</div>}
      </motion.div>

      {/* Gap Finder */}
      {compAnalysis?.competitors?.length ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔍 Content Gap Finder</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Topics competitors cover that you haven't explored yet</div>
          {(() => {
            const compHooks = new Set(compAnalysis.competitors.flatMap(c => c.patterns.topHookTypes ?? []))
            const yourHooks = new Set(compAnalysis.competitors.length > 0 ? ['Story opener'] : [])
            const gaps = [...compHooks].filter(h => !yourHooks.has(h)).slice(0, 5)
            const compTopics = compAnalysis.competitors.flatMap(c => c.breakdowns.map(b => b.hookType)).filter((v,i,a) => a.indexOf(v) === i)
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {gaps.map((gap, i) => (
                  <div key={i} style={{ padding: '8px 14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
                    💡 Try: {gap}
                  </div>
                ))}
                {gaps.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>You're covering all competitor hook types! 🎉</div>}
              </div>
            )
          })()}
        </motion.div>
      ) : null}

      {/* Side-by-Side Metrics */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>&#128202; Side-by-Side Metrics</div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, paddingBottom: 12, borderBottom: '1px solid #1c2a47' }}>Metric</th>
              {filled.map(c => <th key={c.handle} style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600, paddingBottom: 12, borderBottom: '1px solid #1c2a47' }}>{c.handle}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Followers', values: filled.map(c => c.followers) },
              { label: 'Top Reel Views', values: filled.map(c => c.topViews) },
              { label: 'Eng Rate', values: filled.map(c => c.engRate) },
            ].map((row, ri, arr) => (
              <tr key={row.label}>
                <td style={{ padding: '11px 0', color: '#64748b', borderBottom: ri < arr.length - 1 ? '1px solid #131d35' : 'none' }}>{row.label}</td>
                {row.values.map((v, vi) => <td key={vi} style={{ textAlign: 'center', padding: '11px 0', fontWeight: 600, borderBottom: ri < arr.length - 1 ? '1px solid #131d35' : 'none' }}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </motion.div>
    </>
  )
}
