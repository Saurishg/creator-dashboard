'use client'

import { motion } from 'framer-motion'

export default function SettingsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8 }}>
        ⚙️ Settings
      </h1>
      <p style={{ fontSize: 13, color: '#64748b' }}>Coming soon — configure your account and preferences.</p>
    </motion.div>
  )
}
