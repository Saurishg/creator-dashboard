'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { StrategicFix, PostFix, Severity } from './page'

interface Props {
  strategic: StrategicFix[]
  posts: PostFix[]
  analysedAt: string | null
  totalReels: number
  competitorHandles: string[]
}

const SEV_COLOR: Record<Severity, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,.12)',  text: '#ef4444', border: 'rgba(239,68,68,.3)',  label: 'CRITICAL' },
  medium:   { bg: 'rgba(245,158,11,.12)', text: '#f59e0b', border: 'rgba(245,158,11,.3)', label: 'MEDIUM'   },
  low:      { bg: 'rgba(6,182,212,.12)',  text: '#06b6d4', border: 'rgba(6,182,212,.3)',  label: 'LOW'      },
}

const SOURCE_LABEL: Record<StrategicFix['source'], string> = {
  weakness:         '🔴 Own weakness',
  recommendation:   '💡 AI recommendation',
  'competitor-gap': '🎯 Competitive gap',
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

type Tab = 'strategic' | 'posts'

export default function FixesClient({ strategic, posts, analysedAt, totalReels, competitorHandles }: Props) {
  const [tab, setTab]           = useState<Tab>('strategic')
  const [filter, setFilter]     = useState<Severity | 'all'>('all')

  const counts = useMemo(() => {
    const c = { critical: 0, medium: 0, low: 0 }
    for (const s of strategic) c[s.severity]++
    for (const p of posts)     c[p.severity]++
    return c
  }, [strategic, posts])

  const filteredStrategic = filter === 'all' ? strategic : strategic.filter((s) => s.severity === filter)
  const filteredPosts     = filter === 'all' ? posts     : posts.filter((p) => p.severity === filter)

  const hasData = strategic.length > 0 || posts.length > 0

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>
          🛠️  Fixes Needed
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          {hasData
            ? `${strategic.length} strategic + ${posts.length} per-post · From ${totalReels} reels analysed${analysedAt ? ` · ${timeAgo(analysedAt)}` : ''}`
            : 'No analysis yet. Run an analysis from the Dashboard to surface fixes.'}
          {hasData && (
            <span style={{ marginLeft: 8, color: '#10b981', fontSize: 11, background: 'rgba(16,185,129,.1)', padding: '1px 6px', borderRadius: 99 }}>
              🟢 Live
            </span>
          )}
        </p>
      </motion.div>

      {/* Severity summary cards */}
      {hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {(['critical', 'medium', 'low'] as const).map((sev) => {
            const s = SEV_COLOR[sev]
            const active = filter === sev
            return (
              <button
                key={sev}
                onClick={() => setFilter(active ? 'all' : sev)}
                style={{
                  background: active ? s.bg : '#0f172a',
                  border: `1px solid ${active ? s.text : '#1e293b'}`,
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                }}
              >
                <div style={{ fontSize: 11, color: s.text, fontWeight: 700, letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>{counts[sev]}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {sev === 'critical' ? 'Must fix soon' : sev === 'medium' ? 'Worth improving' : 'Nice to have'}
                </div>
              </button>
            )
          })}
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 14,
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: 13,
              }}
            >
              Show all severities
            </button>
          )}
        </div>
      )}

      {/* Tab switcher */}
      {hasData && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e293b' }}>
          {(['strategic', 'posts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                border: 'none',
                color: tab === t ? '#f1f5f9' : '#64748b',
                fontSize: 14,
                fontWeight: tab === t ? 700 : 500,
                padding: '10px 16px',
                borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t === 'strategic' ? `Strategic (${strategic.length})` : `Per-Post (${posts.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Strategic fixes */}
      {hasData && tab === 'strategic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredStrategic.length === 0 && (
            <div style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>
              No {filter} fixes in this category.
            </div>
          )}
          {filteredStrategic.map((s, i) => {
            const sc = SEV_COLOR[s.severity]
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: '#0f172a',
                  border: `1px solid ${sc.border}`,
                  borderLeft: `4px solid ${sc.text}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                    color: sc.text, background: sc.bg,
                    padding: '2px 8px', borderRadius: 99,
                  }}>{sc.label}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{SOURCE_LABEL[s.source]}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
                  {s.title}
                </div>
                {s.detail && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, lineHeight: 1.5 }}>
                    {s.detail}
                  </div>
                )}
                {s.evidence && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>
                    {s.evidence}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Per-post fixes */}
      {hasData && tab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredPosts.length === 0 && (
            <div style={{ color: '#64748b', padding: 20, textAlign: 'center' }}>
              No {filter} posts to fix in this category.
            </div>
          )}
          {filteredPosts.map((p, i) => {
            const sc = SEV_COLOR[p.severity]
            return (
              <motion.a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 20) * 0.02 }}
                style={{
                  background: '#0f172a',
                  border: `1px solid ${sc.border}`,
                  borderLeft: `4px solid ${sc.text}`,
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  gap: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform .12s ease, background .12s ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                      color: sc.text, background: sc.bg,
                      padding: '2px 8px', borderRadius: 99,
                    }}>{sc.label}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{p.reason}</span>
                  </div>
                  {p.hook && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                      "{p.hook.slice(0, 100)}{p.hook.length > 100 ? '…' : ''}"
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.caption || <em style={{ color: '#64748b' }}>No caption</em>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                  <div>{formatNum(p.views)} views</div>
                  <div>{formatNum(p.likes)} likes · {formatNum(p.comments)} c</div>
                  <div style={{ marginTop: 4, color: '#94a3b8' }}>{p.engagementScore.toFixed(1)}% eng</div>
                </div>
              </motion.a>
            )
          })}
        </div>
      )}

      {!hasData && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            Run an analysis to see fixes. Go to <strong style={{ color: '#f1f5f9' }}>Dashboard → Analyse</strong>.
          </div>
        </div>
      )}

      {competitorHandles.length > 0 && hasData && (
        <div style={{ marginTop: 24, fontSize: 11, color: '#64748b' }}>
          Competitive gaps drawn from: {competitorHandles.map((h) => `@${h}`).join(', ')}
        </div>
      )}
    </>
  )
}
