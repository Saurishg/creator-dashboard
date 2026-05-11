'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Header({ username, analysedAt }: { username?: string; analysedAt?: string }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const name = username ? username.charAt(0).toUpperCase() + username.slice(1) : 'there'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: isMobile ? 12 : 0,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>
          {greeting()}, {name} &#128075;
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          {analysedAt
            ? `Last analysed ${timeAgo(analysedAt)} · @${username}`
            : 'Dashboard ready — run setup to load live data'
          }
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: isMobile ? '100%' : undefined }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
        <button
          onClick={() => router.push('/analysis')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #1c2a47', background: '#0f1629', color: '#94a3b8', transition: 'all .2s', width: isMobile ? '100%' : undefined, justifyContent: isMobile ? 'center' : undefined }}
        >
          &#129504; Content DNA
        </button>
        <button
          onClick={() => router.push('/setup')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 20px rgba(99,102,241,.35)', transition: 'all .2s', width: isMobile ? '100%' : undefined, justifyContent: isMobile ? 'center' : undefined }}
        >
          &#128260; Re-analyse
        </button>
      </div>
    </motion.div>
  )
}
