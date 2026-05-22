'use client'

import { useState } from 'react'
import type { DashboardReel } from '@/lib/transform'

function csvEscape(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function reelsToCsv(reels: DashboardReel[]): string {
  const headers = ['id', 'title', 'type', 'date', 'dateIso', 'views', 'likes', 'comments', 'engagementPct', 'url']
  const rows = reels.map((r) => {
    const eng = r.viewsRaw > 0 ? (((r.likesRaw + r.commentsRaw) / r.viewsRaw) * 100).toFixed(2) : '0.00'
    return [r.id, r.title, r.type, r.date, r.dateIso ?? '', r.viewsRaw, r.likesRaw, r.commentsRaw, eng, r.url].map(csvEscape).join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ExportButtons({ reels, username }: { reels: DashboardReel[]; username?: string }) {
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null)

  function handleCsv() {
    if (reels.length === 0) {
      alert('No reels to export.')
      return
    }
    setBusy('csv')
    try {
      const csv = reelsToCsv(reels)
      const ts  = new Date().toISOString().slice(0, 10)
      const u   = username ? username.replace(/[^a-z0-9_-]+/gi, '_') : 'creator'
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${u}-reels-${ts}.csv`)
    } finally {
      setBusy(null)
    }
  }

  function handlePdf() {
    if (reels.length === 0) {
      alert('No reels to export.')
      return
    }
    setBusy('pdf')
    try {
      const ts = new Date().toLocaleString()
      const u  = username ? `@${username}` : 'Creator'
      const total = reels.length
      const totalViews = reels.reduce((s, r) => s + r.viewsRaw, 0)
      const totalLikes = reels.reduce((s, r) => s + r.likesRaw, 0)
      const avgEng = totalViews > 0 ? (((totalLikes + reels.reduce((s,r)=>s+r.commentsRaw,0)) / totalViews) * 100).toFixed(2) : '0.00'

      const rows = reels.map((r) => `
        <tr>
          <td>${escapeHtml(r.title)}</td>
          <td>${r.type}</td>
          <td>${escapeHtml(r.date)}</td>
          <td style="text-align:right">${r.viewsRaw.toLocaleString()}</td>
          <td style="text-align:right">${r.likesRaw.toLocaleString()}</td>
          <td style="text-align:right">${r.commentsRaw.toLocaleString()}</td>
        </tr>
      `).join('')

      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${u} — Reel Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 900px; margin: 32px auto; color: #111; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #555; font-size: 12px; margin-bottom: 18px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0 24px; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
  .stat .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat .value { font-size: 18px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #eee; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f6f6f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; }
  @media print { body { margin: 0; } .no-print { display: none; } }
</style></head>
<body>
  <h1>${u} — Reel Performance Report</h1>
  <div class="sub">Generated ${escapeHtml(ts)} · Creator Dashboard</div>
  <div class="summary">
    <div class="stat"><div class="label">Total Reels</div><div class="value">${total}</div></div>
    <div class="stat"><div class="label">Total Views</div><div class="value">${totalViews.toLocaleString()}</div></div>
    <div class="stat"><div class="label">Total Likes</div><div class="value">${totalLikes.toLocaleString()}</div></div>
    <div class="stat"><div class="label">Avg Engagement</div><div class="value">${avgEng}%</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Title</th><th>Type</th><th>Date</th>
      <th style="text-align:right">Views</th><th style="text-align:right">Likes</th><th style="text-align:right">Comments</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="no-print" style="margin-top:24px; color:#666; font-size:11px;">
    Use your browser's print dialog and choose "Save as PDF" to export.
  </p>
  <script>setTimeout(() => window.print(), 250);</script>
</body></html>`

      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) {
        alert('Popup blocked — allow popups to export PDF.')
        return
      }
      win.document.write(html)
      win.document.close()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={handleCsv}
        disabled={busy !== null}
        title="Download reels as CSV"
        style={btnStyle(busy === 'csv')}
      >
        {busy === 'csv' ? '⏳' : '📄'} CSV
      </button>
      <button
        onClick={handlePdf}
        disabled={busy !== null}
        title="Open print-to-PDF view"
        style={btnStyle(busy === 'pdf')}
      >
        {busy === 'pdf' ? '⏳' : '🖨️'} PDF
      </button>
    </div>
  )
}

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    border: '1px solid #1c2a47',
    background: '#0f1629',
    color: '#94a3b8',
    transition: 'all .15s',
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
