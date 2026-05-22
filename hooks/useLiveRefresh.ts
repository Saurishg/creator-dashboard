'use client'

import { useEffect, useRef, useState } from 'react'
import type { DashboardReel, DashboardCompetitor, DashboardStats, DashboardAudio } from '@/lib/transform'
import type { AnalysisResult } from '@/lib/analysis-types'

export interface LiveDashboardData {
  username:      string | null
  reels:         DashboardReel[]
  stats:         DashboardStats | null
  competitors:   DashboardCompetitor[]
  trendingAudio: DashboardAudio[]
  analysis:      AnalysisResult | null
  scrapedAt:     string | null
  fetchedAt:     string | null
}

export interface LiveRefreshOptions {
  enabled: boolean
  intervalSec: number
  initial: LiveDashboardData
}

export interface LiveRefreshState extends LiveDashboardData {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastFetchedAt: string | null
}

export function useLiveRefresh({ enabled, intervalSec, initial }: LiveRefreshOptions): LiveRefreshState {
  const [data, setData]   = useState<LiveDashboardData>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inflight = useRef(false)

  async function refresh() {
    if (inflight.current) return
    inflight.current = true
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      const token = process.env.NEXT_PUBLIC_API_AUTH_TOKEN
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch('/api/dashboard-data', { headers, cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const fresh = (await res.json()) as LiveDashboardData
      setData(fresh)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setLoading(false)
      inflight.current = false
    }
  }

  useEffect(() => {
    if (!enabled || intervalSec <= 0) return
    const id = window.setInterval(() => { refresh() }, intervalSec * 1000)
    return () => window.clearInterval(id)
  }, [enabled, intervalSec])

  return {
    ...data,
    loading,
    error,
    refresh,
    lastFetchedAt: data.fetchedAt,
  }
}
