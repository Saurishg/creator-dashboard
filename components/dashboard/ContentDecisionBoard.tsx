'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { AnalysisResult } from '@/lib/analysis-types'
import type { DashboardReel } from '@/lib/transform'
import { buildContentInsights } from '@/lib/content-insights'

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

interface PlanningHealth {
  calendarPosts: number | null
  calendarGeneratedAt: string | null
  competitorAnalysedAt: string | null
}

function ageLabel(iso: string | null): string {
  if (!iso) return 'not available'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'today' : `${days} days ago`
}

export default function ContentDecisionBoard({
  reels,
  analysis,
  planningHealth,
}: {
  reels: DashboardReel[]
  analysis: AnalysisResult | null
  planningHealth: PlanningHealth
}) {
  const insights = useMemo(() => buildContentInsights(reels, analysis), [reels, analysis])
  const coverageColor = insights.coveragePct >= 70 ? '#10b981' : insights.coveragePct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ marginBottom: 20, borderTop: '1px solid #1c2a47', borderBottom: '1px solid #1c2a47', padding: '20px 0' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Content Decision Board</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>Evidence from posts with recorded Instagram view counts</div>
        </div>
        <div style={{ color: coverageColor, background: `${coverageColor}16`, border: `1px solid ${coverageColor}33`, padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
          {insights.coveragePct}% view coverage
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Measured posts', value: `${insights.measuredPosts} / ${insights.totalPosts}`, note: 'Posts with view counts' },
          { label: 'Median reach', value: formatNumber(insights.medianViews), note: 'More reliable than average' },
          { label: 'Average reach', value: formatNumber(insights.averageViews), note: 'Sensitive to viral outliers' },
          { label: 'High performers', value: String(insights.highPerformers), note: 'At least 2x median reach' },
        ].map((item) => (
          <div key={item.label} style={{ minWidth: 0, borderLeft: '2px solid #6366f1', padding: '2px 0 2px 12px' }}>
            <div style={{ color: '#64748b', fontSize: 11 }}>{item.label}</div>
            <div style={{ color: '#f0f4ff', fontWeight: 800, fontSize: 20, margin: '4px 0' }}>{item.value}</div>
            <div style={{ color: '#64748b', fontSize: 10 }}>{item.note}</div>
          </div>
        ))}
      </div>

      <div className="content-decision-grid" style={{ gap: 20, marginBottom: 18 }}>
        <div>
          <div style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>NEXT EXPERIMENT</div>
          <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.55 }}>{insights.recommendation}</div>
          {insights.hookEvidence && (
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 7 }}>
              {insights.hookEvidence.label}: {formatNumber(insights.hookEvidence.medianViews)} median views and {insights.hookEvidence.engagementRate}% engagement.
            </div>
          )}
        </div>
        <div>
          <div style={{ color: coverageColor, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>DATA HEALTH</div>
          <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.55 }}>{insights.qualityNote}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1c2a47', paddingTop: 16 }}>
        <div style={{ color: '#f0f4ff', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Recommended Content Plan</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          <ActionItem
            color="#8b5cf6"
            title="Reach experiment"
            detail={insights.hookEvidence
              ? `Use ${insights.hookEvidence.label.toLowerCase()} openings 1-2 times per week. Their ${formatNumber(insights.hookEvidence.medianViews)} median reach leads the tested formats.`
              : 'Test a number-led opening against the median reach baseline.'}
          />
          <ActionItem
            color="#10b981"
            title="Engagement default"
            detail={insights.engagementHook
              ? `Use ${insights.engagementHook.label.toLowerCase()} openings as the default. They deliver ${insights.engagementHook.engagementRate}% engagement across ${insights.engagementHook.samples} measured posts.`
              : 'Use questions and clear comment prompts until enough hook data is collected.'}
          />
          <ActionItem
            color="#f59e0b"
            title="Format to reduce"
            detail={insights.underperformingHook
              ? `Use ${insights.underperformingHook.label.toLowerCase()} only when the story is essential. It has ${insights.underperformingHook.engagementRate}% engagement across ${insights.underperformingHook.samples} measured posts.`
              : 'Do not repeat a format until it has enough measured posts to validate performance.'}
          />
          <ActionItem
            color="#ef4444"
            title="Data refresh"
            detail={`${insights.missingViews} posts are missing views and ${insights.missingHooks} analysis records are missing hooks. Refresh the scrape before relying on timing or trend calls.`}
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1c2a47', marginTop: 16, paddingTop: 14, color: '#94a3b8', fontSize: 11.5, lineHeight: 1.55 }}>
        Planning hygiene: calendar has {planningHealth.calendarPosts ?? 0} posts and was generated {ageLabel(planningHealth.calendarGeneratedAt)}. Competitor research was last analysed {ageLabel(planningHealth.competitorAnalysedAt)}; refresh both before using trend or scheduling recommendations.
      </div>
    </motion.section>
  )
}

function ActionItem({ color, title, detail }: { color: string; title: string; detail: string }) {
  return (
    <div style={{ borderLeft: `2px solid ${color}`, paddingLeft: 11, minWidth: 0 }}>
      <div style={{ color, fontSize: 11, fontWeight: 800, marginBottom: 5 }}>{title.toUpperCase()}</div>
      <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.55 }}>{detail}</div>
    </div>
  )
}
