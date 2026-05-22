'use client'

import { motion } from 'framer-motion'
import type { ReelType } from '@/lib/transform'

export type SortKey = 'date' | 'views' | 'engagement'
export type DateRange = '7d' | '30d' | '90d' | 'all'

export interface FilterState {
  query: string
  range: DateRange
  type: ReelType | 'All'
  sort: SortKey
}

export const DEFAULT_FILTERS: FilterState = {
  query: '',
  range: 'all',
  type: 'All',
  sort: 'date',
}

const REEL_TYPES: (ReelType | 'All')[] = ['All', 'Educational', 'Lifestyle', 'Behind Scenes', 'Story', 'Other']
const RANGES: { value: DateRange; label: string }[] = [
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date',       label: 'Newest' },
  { value: 'views',      label: 'Top views' },
  { value: 'engagement', label: 'Top engagement' },
]

interface Props {
  filters: FilterState
  onChange: (next: FilterState) => void
  totalCount: number
  visibleCount: number
}

export default function DashboardFilters({ filters, onChange, totalCount, visibleCount }: Props) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value })
  }

  const isFiltered = filters.range !== 'all' || filters.type !== 'All' || filters.query.trim().length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#0f1629',
        border: '1px solid #1c2a47',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#64748b', pointerEvents: 'none' }}>🔍</span>
        <input
          value={filters.query}
          onChange={(e) => update('query', e.target.value)}
          placeholder="Search reels, competitors, audio…"
          aria-label="Search dashboard"
          style={{
            width: '100%',
            background: '#131d35',
            border: '1px solid #1c2a47',
            color: '#f0f4ff',
            borderRadius: 8,
            padding: '9px 12px 9px 34px',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      <Select<DateRange>
        value={filters.range}
        onChange={(v) => update('range', v)}
        options={RANGES}
        ariaLabel="Date range"
      />
      <Select<ReelType | 'All'>
        value={filters.type}
        onChange={(v) => update('type', v)}
        options={REEL_TYPES.map((t) => ({ value: t, label: t }))}
        ariaLabel="Content type"
      />
      <Select<SortKey>
        value={filters.sort}
        onChange={(v) => update('sort', v)}
        options={SORTS}
        ariaLabel="Sort"
      />

      <div style={{ fontSize: 11.5, color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        {isFiltered ? (
          <>
            <strong style={{ color: '#a5b4fc' }}>{visibleCount}</strong>
            <span> of {totalCount} reels</span>
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              style={{
                marginLeft: 10, background: 'transparent', border: 'none',
                color: '#64748b', cursor: 'pointer', fontSize: 11.5, textDecoration: 'underline',
              }}
            >
              Clear
            </button>
          </>
        ) : (
          <span>{totalCount} reels</span>
        )}
      </div>
    </motion.div>
  )
}

function Select<T extends string>({
  value, onChange, options, ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  ariaLabel: string
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        background: '#131d35',
        border: '1px solid #1c2a47',
        color: '#f0f4ff',
        borderRadius: 8,
        padding: '9px 26px 9px 12px',
        fontSize: 12.5,
        fontFamily: 'inherit',
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: 'linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%)',
        backgroundPosition: 'calc(100% - 14px) 50%, calc(100% - 9px) 50%',
        backgroundSize: '5px 5px, 5px 5px',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: '#0f1629' }}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
