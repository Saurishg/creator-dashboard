'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Summary { reels: number; analysed: number; competitors: number }

const STEP_LABELS = [
  { icon: '🎯', label: 'Your Profile' },
  { icon: '🔍', label: 'Competitors' },
  { icon: '🧠', label: 'Analysing' },
]

function InputField({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 10, padding: '10px 14px' }}>
      <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 14 }}>@</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace('@', '').trim())}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: '#f0f4ff', fontSize: 14, fontWeight: 500,
        }}
      />
    </div>
  )
}

function ProgressStep({ label, status }: { label: string; status: 'done' | 'active' | 'pending' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
        background: status === 'done' ? 'rgba(16,185,129,.15)' : status === 'active' ? 'rgba(99,102,241,.15)' : '#0f1629',
        border: `1px solid ${status === 'done' ? '#10b981' : status === 'active' ? '#6366f1' : '#1c2a47'}`,
        color: status === 'done' ? '#10b981' : status === 'active' ? '#a5b4fc' : '#475569',
      }}>
        {status === 'done' ? '✓' : status === 'active' ? '⋯' : '○'}
      </div>
      <span style={{ fontSize: 13, color: status === 'done' ? '#10b981' : status === 'active' ? '#e2e8f0' : '#475569' }}>
        {label}
      </span>
    </div>
  )
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [username, setUsername] = useState('')
  const [competitors, setCompetitors] = useState(['', '', ''])
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function runSetup() {
    setStep(3)
    setError(null)
    setProgress(0)

    const validCompetitors = competitors.filter((c) => c.trim())
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_AUTH_TOKEN ?? ''}`,
        },
        body: JSON.stringify({ username: username.trim(), competitors: validCompetitors }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        setError(errText || `Server error ${res.status}`)
        return
      }

      if (!res.body) throw new Error('No response stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.step) setCurrentStep(data.step)
            if (data.progress != null) setProgress(data.progress)
            if (data.error) { setError(data.error); return }
            if (data.done && data.summary) setSummary(data.summary)
          } catch { /* ignore parse errors on partial chunks */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Setup failed')
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#07090f', padding: 24,
    }}>
      {/* background glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '30%', width: 600, height: 600, background: 'radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '20%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 70%)', borderRadius: '50%' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 0 30px rgba(99,102,241,.4)' }}>⚡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>CreatorOS</div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.8px', fontWeight: 500 }}>CREATOR INTELLIGENCE</div>
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
          {STEP_LABELS.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step > i + 1 ? 'rgba(16,185,129,.15)' : step === i + 1 ? 'rgba(99,102,241,.2)' : '#0f1629',
                border: `1px solid ${step > i + 1 ? '#10b981' : step === i + 1 ? '#6366f1' : '#1c2a47'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>
                {step > i + 1 ? '✓' : s.icon}
              </div>
              <span style={{ fontSize: 11, color: step === i + 1 ? '#a5b4fc' : '#475569', fontWeight: step === i + 1 ? 600 : 400 }}>{s.label}</span>
              {i < 2 && <div style={{ width: 20, height: 1, background: '#1c2a47', margin: '0 4px' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 18, padding: 32 }}>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Username ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>Your Instagram</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
                  We'll scrape your reels, transcribe every word with Whisper, and build your content DNA.
                </div>
                <InputField value={username} onChange={setUsername} placeholder="yourusername" />
                <button
                  onClick={() => username.trim() && setStep(2)}
                  disabled={!username.trim()}
                  style={{
                    marginTop: 20, width: '100%', padding: '13px 0',
                    background: username.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1c2a47',
                    border: 'none', borderRadius: 10, color: username.trim() ? '#fff' : '#475569',
                    fontSize: 14, fontWeight: 700, cursor: username.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue →
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Competitors ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>Your Competitors</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
                  We'll scrape their top reels so you know exactly what's working in your niche. Skip if you don't have any yet.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {competitors.map((c, i) => (
                    <InputField key={i} value={c} onChange={(v) => setCompetitors((prev) => prev.map((x, j) => j === i ? v : x))} placeholder={`competitor${i + 1}`} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #1c2a47', borderRadius: 10, color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button
                    onClick={runSetup}
                    style={{ flex: 2, padding: '12px 0', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    🚀 Run Full Analysis
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Progress ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {!summary && !error && (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Analysing your content DNA…</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>This can take 5–10 minutes, depending on video count.</div>

                    <ProgressStep label={`Scraping @${username}'s reels`} status={progress >= 22 ? 'done' : progress >= 8 ? 'active' : 'pending'} />
                    <ProgressStep label="Transcribing with Whisper medium" status={progress >= 67 ? 'done' : progress >= 22 ? 'active' : 'pending'} />
                    <ProgressStep label="Scraping competitors" status={progress >= 75 ? 'done' : progress >= 30 ? 'active' : 'pending'} />
                    <ProgressStep label="phi4 pattern analysis" status={progress >= 95 ? 'done' : progress >= 67 ? 'active' : 'pending'} />
                    <ProgressStep label="Building your dashboard" status={progress >= 100 ? 'done' : progress >= 90 ? 'active' : 'pending'} />

                    {/* progress bar */}
                    <div style={{ marginTop: 24, height: 6, background: '#1c2a47', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99 }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{currentStep}</div>
                      <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 700 }}>{progress}%</div>
                    </div>
                  </>
                )}

                {summary && (
                  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 42, marginBottom: 16 }}>🎉</div>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>Your dashboard is ready!</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, margin: '20px 0 28px' }}>
                      {[
                        { n: summary.reels,      label: 'reels found' },
                        { n: summary.analysed,   label: 'transcribed' },
                        { n: summary.competitors,label: 'competitors' },
                      ].map(({ n, label }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#a5b4fc' }}>{n}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push('/')}
                      style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    >
                      View Dashboard →
                    </button>
                  </motion.div>
                )}

                {error && (
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#f87171' }}>⚠️ Something went wrong</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20, background: '#0a1020', padding: 12, borderRadius: 8, wordBreak: 'break-all' }}>{error}</div>
                    <button onClick={() => { setStep(2); setError(null) }} style={{ width: '100%', padding: '12px 0', background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 10, color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      ← Try Again
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#334155' }}>
          Your data stays local except Apify scraping + local AI (phi4 + Whisper) when those features run.
        </div>
      </motion.div>
    </div>
  )
}
