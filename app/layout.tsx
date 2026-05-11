import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Creator Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', background: '#07090f', color: '#f0f4ff', minHeight: '100vh' }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
