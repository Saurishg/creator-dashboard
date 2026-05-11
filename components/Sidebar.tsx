'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navMain = [
  { icon: '📊', label: 'Dashboard',      href: '/',               badge: null },
  { icon: '🔍', label: 'Competitors',    href: '/competitors',    badge: 3    },
  { icon: '💡', label: 'Reel Ideas',     href: '/reel-ideas',     badge: 5    },
  { icon: '🎵', label: 'Trending Audio', href: '/trending-audio', badge: null },
  { icon: '🧠', label: 'Content DNA',    href: '/analysis',       badge: null },
]

const navAccount = [
  { icon: '📅', label: 'Content Calendar', href: '/calendar'       },
  { icon: '📈', label: 'Growth Tracker',   href: '/growth'         },
  { icon: '⚙️', label: 'Settings',         href: '/settings'       },
]

function NavItem({
  icon, label, href, badge, isActive,
}: {
  icon: string; label: string; href: string; badge?: number | null; isActive: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        color: isActive ? '#a5b4fc' : '#94a3b8',
        fontSize: 13.5,
        fontWeight: 500,
        cursor: 'pointer',
        marginBottom: 2,
        background: isActive ? 'rgba(99,102,241,.15)' : 'transparent',
        border: isActive ? '1px solid rgba(99,102,241,.25)' : '1px solid transparent',
        textDecoration: 'none',
        transition: 'all .2s',
      }}
    >
      <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
      {label}
      {badge != null && (
        <span
          style={{
            marginLeft: 'auto',
            background: '#6366f1',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 99,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState({
    displayName: 'Creator',
    username: 'yourusername',
    brandName: 'CreatorOS',
  })

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.profile) setProfile(data.profile)
      })
      .catch(() => {})
  }, [])

  const initial = profile.displayName.charAt(0).toUpperCase() || 'C'

  return (
    <aside
      style={{
        width: 230,
        minHeight: '100vh',
        background: '#0c1220',
        borderRight: '1px solid #1c2a47',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 8px 28px',
          borderBottom: '1px solid #1c2a47',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            boxShadow: '0 0 20px rgba(99,102,241,.35)',
          }}
        >
          ⚡
        </div>
          <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>{profile.brandName}</div>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.5px', fontWeight: 500 }}>
            CREATOR INTELLIGENCE
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '1.2px',
          color: '#64748b',
          textTransform: 'uppercase',
          padding: '0 8px',
          marginBottom: 8,
        }}
      >
        Main
      </div>
      {navMain.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          isActive={pathname === item.href}
        />
      ))}

      <div style={{ height: 16 }} />

      {/* Account nav */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '1.2px',
          color: '#64748b',
          textTransform: 'uppercase',
          padding: '0 8px',
          marginBottom: 8,
        }}
      >
        Account
      </div>
      {navAccount.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          isActive={pathname === item.href}
        />
      ))}

      {/* Footer profile */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #1c2a47', paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 10,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.displayName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>@{profile.username}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 14, color: '#64748b' }}>›</div>
        </div>
      </div>
    </aside>
  )
}
