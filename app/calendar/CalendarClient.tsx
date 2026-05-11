'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { GeneratedCalendar, GeneratedPost } from '@/app/api/generate-calendar/route'

const WEEKDAY_ORDER = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${WEEKDAY_ORDER[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function EmptyState({ onGenerate, generating, progress, statusMsg }: {
  onGenerate: () => void; generating: boolean; progress: number; statusMsg: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', gap: 16 }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: 52 }}>📅</motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 8 }}>Generate Your 30-Day Content Calendar</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 420, marginBottom: 24 }}>
          Claude will analyse your reel patterns, competitor data, and weaknesses to create 20+ original reel ideas — none of which you've posted before.
        </div>

        {generating ? (
          <div style={{ width: 360 }}>
            <div style={{ fontSize: 13, color: '#a5b4fc', marginBottom: 10 }}>{statusMsg}</div>
            <div style={{ height: 6, background: '#1c2a47', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
                style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{progress}%</div>
          </div>
        ) : (
          <button onClick={onGenerate} style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,.4)' }}>
            ✨ Generate with Claude
          </button>
        )}
      </motion.div>
    </div>
  )
}

export default function CalendarClient({ calendar }: { calendar: GeneratedCalendar | null }) {
  const router = useRouter()
  const [done, setDone] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<GeneratedPost | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('calendar-done')
      if (saved) setDone(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [])

  function toggleDone(day: number) {
    const next = new Set(done)
    next.has(day) ? next.delete(day) : next.add(day)
    setDone(next)
    localStorage.setItem('calendar-done', JSON.stringify(Array.from(next)))
  }

  async function generate() {
    setGenerating(true)
    setProgress(5)
    setStatusMsg('Preparing analysis data for Claude…')
    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_AUTH_TOKEN ?? ''}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setStatusMsg((err as { error?: string }).error ?? 'Error generating calendar')
        setGenerating(false)
        return
      }
      if (!res.body) { setStatusMsg('Stream error'); setGenerating(false); return }
      const reader = res.body.getReader()
      const dec = new TextDecoder('utf-8')
      let buf = ''
      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const msg = JSON.parse(line.slice(5))
            if (msg.step) setStatusMsg(msg.step)
            if (msg.progress) setProgress(msg.progress)
            if (msg.done) { router.refresh(); setGenerating(false) }
            if (msg.error) { setStatusMsg(`Error: ${msg.error}`); setGenerating(false) }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setStatusMsg('Network error — check console')
      setGenerating(false)
    }
  }

  if (!calendar) return <EmptyState onGenerate={generate} generating={generating} progress={progress} statusMsg={statusMsg} />

  const posts = calendar.posts

  if (posts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>No posts generated</div>
      </div>
    )
  }

  const doneCount = Array.from(done).filter((d) => posts.find((p) => p.day === d)).length

  // Compute first date for grid padding
  const firstDate = new Date(posts[0].date + 'T00:00:00')

  return (
    <>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>📅 30-Day Content Calendar</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            {posts.length} posts · {doneCount} done
            <span style={{ marginLeft: 8, color: '#a5b4fc', fontSize: 11, background: 'rgba(99,102,241,.1)', padding: '1px 6px', borderRadius: 99 }}>✨ Claude Generated</span>
            <span style={{ marginLeft: 6, color: '#64748b', fontSize: 11 }}>· {new Date(calendar.generatedAt).toLocaleDateString()}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['list', 'grid'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #1c2a47', background: view === v ? '#1c2a47' : '#0f1629', color: view === v ? '#a5b4fc' : '#64748b' }}>
              {v === 'grid' ? '⊞ Grid' : '≡ List'}
            </button>
          ))}
          <button onClick={generate} disabled={generating} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', border: 'none', background: generating ? '#1c2a47' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: generating ? '#64748b' : '#fff' }}>
            {generating ? '⏳ Generating…' : '↻ Regenerate'}
          </button>
        </div>
      </motion.div>

      {/* Progress */}
      <div style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 10, padding: '12px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Posts completed</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>{doneCount} / {posts.length}</span>
        </div>
        <div style={{ height: 6, background: '#1c2a47', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div animate={{ width: `${posts.length > 0 ? (doneCount / posts.length) * 100 : 0}%` }} transition={{ duration: 0.6 }}
            style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#10b981)', borderRadius: 99 }} />
        </div>
      </div>

      {generating && (
        <div style={{ background: '#0f1629', border: '1px solid rgba(99,102,241,.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 16, fontSize: 13, color: '#a5b4fc' }}>
          ✨ {statusMsg}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map((post, i) => {
            const isDone = done.has(post.day)
            return (
              <motion.div key={post.day} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                onClick={() => setSelected(post)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: isDone ? 'rgba(16,185,129,.05)' : '#0f1629', border: isDone ? '1px solid rgba(16,185,129,.2)' : '1px solid #1c2a47', borderRadius: 12, cursor: 'pointer', transition: 'all .15s' }}
              >
                {/* Date badge */}
                <div style={{ textAlign: 'center', flexShrink: 0, width: 44 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{post.weekday}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isDone ? '#10b981' : '#fff', lineHeight: 1.2 }}>{new Date(post.date + 'T00:00:00').getDate()}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{MONTH_NAMES[new Date(post.date + 'T00:00:00').getMonth()]}</div>
                </div>

                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${post.color}22`, border: `1px solid ${post.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {isDone ? '✅' : post.emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: post.color, background: `${post.color}18`, padding: '2px 8px', borderRadius: 99 }}>{post.hookType}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>{post.topic}</span>
                    {isDone && <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,.1)', padding: '1px 6px', borderRadius: 99 }}>✓ Done</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.hook}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>CTA: {post.cta}</div>
                </div>

                <button onClick={(e) => { e.stopPropagation(); toggleDone(post.day) }}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #1c2a47', background: isDone ? 'rgba(16,185,129,.15)' : '#131d35', color: isDone ? '#10b981' : '#64748b', flexShrink: 0, transition: 'all .15s' }}>
                  {isDone ? '✓ Done' : 'Mark Done'}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* GRID VIEW */}
      {view === 'grid' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
            {WEEKDAY_ORDER.map((l) => <div key={l} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748b', padding: '6px 0' }}>{l}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {Array.from({ length: firstDate.getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
            {Array.from({ length: 30 }).map((_, i) => {
              const d = new Date(firstDate)
              d.setDate(firstDate.getDate() + i)
              const iso = d.toISOString().split('T')[0]
              const post = posts.find((p) => p.date === iso)
              const isDone = post ? done.has(post.day) : false
              return (
                <motion.div key={i} whileHover={post ? { scale: 1.04 } : {}} onClick={() => post && setSelected(post)}
                  style={{ minHeight: 76, borderRadius: 10, padding: 8, cursor: post ? 'pointer' : 'default', background: isDone ? 'rgba(16,185,129,.08)' : post ? '#0f1629' : '#080e1a', border: isDone ? '1px solid rgba(16,185,129,.25)' : post ? `1px solid ${post.color}33` : '1px solid #0c1525', transition: 'all .15s' }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{d.getDate()}</div>
                  {post && (
                    <>
                      <div style={{ fontSize: 15, marginBottom: 3 }}>{isDone ? '✅' : post.emoji}</div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: post.color, lineHeight: 1.2 }}>{post.hookType}</div>
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.topic}</div>
                    </>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 200 }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, background: '#0c1220', borderLeft: '1px solid #1c2a47', zIndex: 201, overflowY: 'auto', padding: 28 }}>

              <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 16, background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, color: '#64748b', fontSize: 20, cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

              <div style={{ fontSize: 30, marginBottom: 10 }}>{selected.emoji}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: selected.color, background: `${selected.color}18`, padding: '3px 10px', borderRadius: 99 }}>{selected.hookType}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{formatDate(selected.date)}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#a5b4fc', marginBottom: 20 }}>{selected.topic}</div>

              {[
                { label: '🎯 Hook (Opening Line)', value: selected.hook, color: selected.color },
                { label: '📝 Body Outline', value: selected.body, color: '#94a3b8' },
                { label: '📣 CTA', value: selected.cta, color: '#10b981' },
                { label: '💡 Why This Will Work', value: selected.whyItWorks, color: '#f59e0b' },
              ].map((s) => (
                <div key={s.label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 7 }}>{s.label}</div>
                  <div style={{ fontSize: 13.5, color: s.color, lineHeight: 1.65, padding: 14, background: '#131d35', borderRadius: 10, border: '1px solid #1c2a47' }}>{s.value}</div>
                </div>
              ))}

              <button onClick={() => { toggleDone(selected.day); setSelected(null) }}
                style={{ width: '100%', padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: done.has(selected.day) ? '#131d35' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: done.has(selected.day) ? '#64748b' : '#fff', marginTop: 4 }}>
                {done.has(selected.day) ? '↩ Mark as Not Done' : '✅ Mark as Done'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
