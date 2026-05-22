'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const COMMANDS = [
  { icon: '📊', label: 'Dashboard',       href: '/' },
  { icon: '🔍', label: 'Competitors',     href: '/competitors' },
  { icon: '💡', label: 'Reel Ideas',      href: '/reel-ideas' },
  { icon: '🎵', label: 'Trending Audio',  href: '/trending-audio' },
  { icon: '🧠', label: 'Content DNA',     href: '/analysis' },
  { icon: '📅', label: 'Content Calendar',href: '/calendar' },
  { icon: '💬', label: 'DM Templates',    href: '/dm-templates' },
  { icon: '📈', label: 'Growth Tracker',  href: '/growth' },
  { icon: '⚙️', label: 'Settings',        href: '/settings' },
  { icon: '🔧', label: 'Setup',           href: '/setup' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))

  function go(href: string) {
    router.push(href)
    setOpen(false)
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && filtered[selected]) { go(filtered[selected].href) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9998 }}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            style={{
              position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
              width: 440, maxWidth: '90vw', background: '#0f1629',
              border: '1px solid #1c2a47', borderRadius: 14,
              boxShadow: '0 24px 64px rgba(0,0,0,.6)', zIndex: 9999, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1c2a47', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#64748b', fontSize: 14 }}>⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
                onKeyDown={onInputKey}
                placeholder="Type a page name…"
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#f0f4ff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
              />
              <kbd style={{ fontSize: 10, color: '#64748b', background: '#131d35', padding: '2px 6px', borderRadius: 4, border: '1px solid #1c2a47' }}>esc</kbd>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
              {filtered.length === 0 && (
                <div style={{ padding: '16px 20px', fontSize: 13, color: '#64748b' }}>No results</div>
              )}
              {filtered.map((cmd, i) => (
                <div
                  key={cmd.href}
                  onClick={() => go(cmd.href)}
                  onMouseEnter={() => setSelected(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', cursor: 'pointer',
                    background: i === selected ? 'rgba(99,102,241,.12)' : 'transparent',
                    transition: 'background .1s',
                  }}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{cmd.icon}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: i === selected ? '#a5b4fc' : '#94a3b8' }}>{cmd.label}</span>
                  {i === selected && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>↵ enter</span>}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
