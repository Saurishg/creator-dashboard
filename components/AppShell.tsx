'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ToastProvider } from '@/components/ToastProvider'
import CommandPalette from '@/components/CommandPalette'
import AIChat from '@/components/AIChat'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSetup = pathname === '/setup'
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isSetup) {
    return <ToastProvider>{children}</ToastProvider>
  }

  return (
    <ToastProvider>
      <CommandPalette />
      <AIChat />
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            background: '#0c1220',
            borderBottom: '1px solid #1c2a47',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            zIndex: 98,
            gap: 14,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 6px',
            }}
          >
            &#9776;
          </button>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>CreatorOS</div>
        </div>
      )}

      <main
        style={{
          marginLeft: isMobile ? 0 : 230,
          flex: 1,
          padding: isMobile ? '70px 16px 48px' : '28px 32px 48px',
          maxWidth: isMobile ? '100%' : 'calc(100vw - 230px)',
        }}
      >
        {children}
      </main>
    </ToastProvider>
  )
}
