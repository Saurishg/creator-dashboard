'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSetup = pathname === '/setup'

  if (isSetup) {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <main style={{ marginLeft: 230, flex: 1, padding: '28px 32px 48px', maxWidth: 'calc(100vw - 230px)' }}>
        {children}
      </main>
    </>
  )
}
