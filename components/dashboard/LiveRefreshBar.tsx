'use client'

import { useEffect, useState } from 'react'
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs'

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return 'just now'
  const s = Math.floor(diff / 1000)
  if (s < 5)    return 'just now'
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  return new Date(iso).toLocaleString()
}

interface Props {
  loading: boolean
  error: string | null
  lastFetchedAt: string | null
  onRefresh: () => void
  rightSlot?: React.ReactNode
}

export default function LiveRefreshBar({ loading, error, lastFetchedAt, onRefresh, rightSlot }: Props) {
  const { prefs, update } = useDashboardPrefs()
  const [now, setNow] = useState(Date.now())

  // Re-render every 15s so the "X ago" label stays fresh
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  // Also re-render whenever lastFetchedAt changes
  useEffect(() => { setNow(Date.now()) }, [lastFetchedAt])

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        marginBottom: 14,
        background: '#0c1220',
        border: '1px solid #1c2a47',
        borderRadius: 12,
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={prefs.liveRefresh}
          onChange={(e) => update('liveRefresh', e.target.checked)}
          style={{ accentColor: '#6366f1', cursor: 'pointer' }}
        />
        <span>
          {prefs.liveRefresh
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
                <span>Live</span>
              </span>
            : <span style={{ color: '#64748b' }}>Live refresh off</span>
          }
        </span>
      </label>

      <select
        aria-label="Refresh interval"
        value={prefs.pollingInterval}
        onChange={(e) => update('pollingInterval', Number(e.target.value))}
        disabled={!prefs.liveRefresh}
        style={{
          background: '#131d35', border: '1px solid #1c2a47', color: '#94a3b8',
          borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit',
          cursor: prefs.liveRefresh ? 'pointer' : 'not-allowed', outline: 'none',
        }}
      >
        <option value={15}>15s</option>
        <option value={30}>30s</option>
        <option value={60}>1m</option>
        <option value={300}>5m</option>
        <option value={900}>15m</option>
      </select>

      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: loading ? 'rgba(99,102,241,.15)' : '#131d35',
          color: loading ? '#94a3b8' : '#a5b4fc',
          border: '1px solid #1c2a47', cursor: loading ? 'wait' : 'pointer',
        }}
        title="Refresh now"
      >
        {loading ? '⏳ Refreshing…' : '↻ Refresh now'}
      </button>

      <div style={{ fontSize: 11.5, color: '#64748b', marginLeft: 4 }} suppressHydrationWarning>
        Last update: <span style={{ color: '#94a3b8' }}>{timeAgo(lastFetchedAt)}</span>
        {error && <span style={{ marginLeft: 10, color: '#fca5a5' }}>⚠ {error}</span>}
        {/* hidden marker so `now` participates in render */}
        <span style={{ display: 'none' }}>{now}</span>
      </div>

      {rightSlot && <div style={{ marginLeft: 'auto' }}>{rightSlot}</div>}
    </div>
  )
}
