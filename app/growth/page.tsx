'use client'

import { motion } from 'framer-motion'

export default function GrowthPage() {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8 }}>
        📈 Growth Tracker
      </h1>
      <p style={{ fontSize: 13, color: '#64748b' }}>Coming soon — track your follower growth over time.</p>
    </motion.div>
  )
}
