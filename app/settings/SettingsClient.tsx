'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { AppConfig } from '@/lib/config'
import type { CreatorProfile } from '@/lib/creator-profile'
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs'

export default function SettingsClient({ config, profile }: { config: AppConfig | null; profile: CreatorProfile }) {
  const [saved, setSaved] = useState(false)
  const { prefs, update, hydrated } = useDashboardPrefs()

  async function handleAutoAnalyse() {
    try {
      const res = await fetch('/api/auto-analyse', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_AUTH_TOKEN ?? ''}` },
      })
      const d = await res.json().catch(() => ({})) as { skipped?: boolean; reason?: string; ok?: boolean; summary?: { analysed?: number }; error?: string }
      alert(d.skipped ? `Skipped: ${d.reason}` : d.ok ? `✅ Analysis complete! ${d.summary?.analysed} reels analysed` : `Error: ${d.error ?? 'Unknown error'}`)
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : 'Network error'}`)
    }
  }

  const sections = [
    {
      title: '👤 Creator Profile',
      items: [
        { label: 'Instagram Handle', value: `@${config?.username || 'not set'}` },
        { label: 'Display Name', value: profile.displayName },
        { label: 'Brand Name', value: profile.brandName },
        { label: 'Content Niche', value: profile.contentNiche },
        { label: 'Audience', value: profile.audience },
        { label: 'Language Style', value: profile.languageStyle },
      ]
    },
    {
      title: '🔍 Competitors',
      items: (config?.competitors || []).map((c, i) => ({ label: `Competitor ${i+1}`, value: `@${c}` }))
    },
    {
      title: '📅 Last Setup',
      items: [{ label: 'Setup At', value: config?.setupAt ? new Date(config.setupAt).toLocaleString() : 'Never' }]
    }
  ]

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>⚙️ Settings</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Your dashboard configuration</p>
      </motion.div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>⚡ Quick Actions</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button onClick={handleAutoAnalyse}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🔄 Auto Re-analyse
          </button>
          <a href="/setup" style={{ padding: '10px 18px', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            🔧 Re-run Setup
          </a>
          <a href="/dm-templates" style={{ padding: '10px 18px', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            💬 DM Templates
          </a>
        </div>
      </motion.div>

      {/* Preferences (client-side, persisted to localStorage) */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🎨 Preferences</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Local to this browser. Not synced.</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <PrefRow label="Theme" hint="Visual mode for the dashboard">
            <ToggleGroup
              value={prefs.theme}
              onChange={(v) => update('theme', v)}
              options={[{ value: 'dark', label: '🌙 Dark' }, { value: 'light', label: '☀️ Light' }]}
              disabled={!hydrated}
            />
          </PrefRow>

          <PrefRow label="Density" hint="Spacing for cards and rows">
            <ToggleGroup
              value={prefs.density}
              onChange={(v) => update('density', v)}
              options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]}
              disabled={!hydrated}
            />
          </PrefRow>

          <PrefRow label="Live refresh" hint="Auto-poll the dashboard for new data">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={prefs.liveRefresh}
                onChange={(e) => update('liveRefresh', e.target.checked)}
                style={{ accentColor: '#6366f1' }}
                disabled={!hydrated}
              />
              {prefs.liveRefresh ? 'Enabled' : 'Disabled'}
            </label>
          </PrefRow>

          <PrefRow label="Refresh interval" hint="How often to poll when live refresh is on">
            <select
              value={prefs.pollingInterval}
              onChange={(e) => update('pollingInterval', Number(e.target.value))}
              disabled={!hydrated || !prefs.liveRefresh}
              style={{
                background: '#131d35', border: '1px solid #1c2a47', color: '#f0f4ff',
                borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit',
                cursor: prefs.liveRefresh ? 'pointer' : 'not-allowed', outline: 'none',
              }}
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
            </select>
          </PrefRow>
        </div>
      </motion.div>

      {/* Config display */}
      {sections.map((section, si) => (
        <motion.div key={si} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}
          style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{section.title}</div>
          {section.items.length === 0 && <div style={{ fontSize: 13, color: '#64748b' }}>None configured</div>}
          {section.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: i < section.items.length-1 ? '1px solid #131d35' : 'none' }}>
              <div style={{ fontSize: 12, color: '#64748b', width: 140, flexShrink: 0 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: '#e2e8f0', flex: 1 }}>{item.value}</div>
            </div>
          ))}
        </motion.div>
      ))}

      <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 8 }}>
        To change settings, edit <code style={{ background: '#131d35', padding: '1px 6px', borderRadius: 4 }}>.env.local</code> and re-run setup
      </div>
    </>
  )
}

function PrefRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{hint}</div>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  )
}

function ToggleGroup<T extends string>({
  value, onChange, options, disabled,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'inline-flex', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            disabled={disabled}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: 'none',
              background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
              color: active ? '#fff' : '#94a3b8',
              transition: 'all .15s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
