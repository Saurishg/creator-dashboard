'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const STORAGE_KEY = 'dm-templates-v1'

const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Collab Request', text: 'Hey! Love your content 🔥 I create similar content and think we could do an amazing collab. Would you be open to it? DM me!' },
  { id: 2, name: 'Thank You Reply', text: 'Thank you so much! 🙏 Your support means everything. Stay tuned for more content coming soon! ✨' },
  { id: 3, name: 'Product Inquiry', text: 'Hi! Thanks for reaching out 😊 For product/brand inquiries please email me at [your email]. I\'d love to work together!' },
  { id: 4, name: 'New Follower Welcome', text: 'Welcome to my page! 🎉 So happy to have you here. Make sure to turn on notifications so you never miss a reel! 💫' },
  { id: 5, name: 'Giveaway Entry', text: 'You\'re entered! 🎊 Winner announced on [date]. Good luck! Don\'t forget to share with friends for extra entries 🤞' },
]

export default function DMTemplatesPage() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [hydrated, setHydrated] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [newText, setNewText] = useState('')
  const [copied, setCopied] = useState<number | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setTemplates(JSON.parse(stored))
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)) } catch { /* ignore */ }
  }, [templates, hydrated])

  function copy(id: number, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  function save() {
    if (!newName.trim() || !newText.trim()) return
    if (editing !== null) {
      setTemplates(t => t.map(x => x.id === editing ? { ...x, name: newName, text: newText } : x))
    } else {
      setTemplates(t => [...t, { id: Date.now(), name: newName, text: newText }])
    }
    setEditing(null); setNewName(''); setNewText('')
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>💬 Instagram DM Templates</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Quick-copy reply templates in your style</p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {templates.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setEditing(t.id); setNewName(t.name); setNewText(t.text) }}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #1c2a47', background: '#131d35', color: '#64748b' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => copy(t.id, t.text)}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: copied === t.id ? 'rgba(16,185,129,.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: copied === t.id ? '#10b981' : '#fff' }}>
                  {copied === t.id ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button onClick={() => setTemplates(ts => ts.filter(x => x.id !== t.id))}
                  style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #1c2a47', background: '#131d35', color: '#64748b' }}>
                  ✕
                </button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, background: '#131d35', padding: '10px 14px', borderRadius: 8 }}>{t.text}</div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit form */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{editing !== null ? '✏️ Edit Template' : '+ New Template'}</div>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Template name (e.g. Collab Request)"
          style={{ width: '100%', padding: '10px 14px', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, color: '#f0f4ff', fontSize: 13, outline: 'none', marginBottom: 10 }} />
        <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="DM text…" rows={3}
          style={{ width: '100%', padding: '10px 14px', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, color: '#f0f4ff', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 10, fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={!newName.trim() || !newText.trim()}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {editing !== null ? 'Update' : 'Save Template'}
          </button>
          {editing !== null && (
            <button onClick={() => { setEditing(null); setNewName(''); setNewText('') }}
              style={{ padding: '10px 16px', background: '#131d35', border: '1px solid #1c2a47', borderRadius: 8, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}
