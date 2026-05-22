'use client'

import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
export type Density = 'comfortable' | 'compact'

export interface DashboardPrefs {
  theme: Theme
  density: Density
  pollingInterval: number   // seconds; 0 = disabled
  liveRefresh: boolean
}

const DEFAULTS: DashboardPrefs = {
  theme: 'dark',
  density: 'comfortable',
  pollingInterval: 60,
  liveRefresh: false,
}

const KEY = 'creator-dashboard-prefs-v1'

function readPrefs(): DashboardPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return DEFAULTS
  }
}

function writePrefs(prefs: DashboardPrefs): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* quota / private mode */ }
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.body.dataset.theme = theme
}

export function applyDensity(density: Density): void {
  if (typeof document === 'undefined') return
  document.body.dataset.density = density
}

export function useDashboardPrefs() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const p = readPrefs()
    setPrefs(p)
    applyTheme(p.theme)
    applyDensity(p.density)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    writePrefs(prefs)
    applyTheme(prefs.theme)
    applyDensity(prefs.density)
  }, [prefs, hydrated])

  function update<K extends keyof DashboardPrefs>(key: K, value: DashboardPrefs[K]) {
    setPrefs((cur) => ({ ...cur, [key]: value }))
  }

  return { prefs, update, hydrated }
}
