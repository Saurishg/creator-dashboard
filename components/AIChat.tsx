'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "What's my best hook type and why?",
  "Why are some reels underperforming?",
  "What should I post this week?",
  "How do I compare to my competitors?",
  "What's my proven winning formula?",
  "Which content gaps should I fill first?",
]

function TypingDot() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 0' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#6366f1',
          display: 'inline-block',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginRight: 8, marginTop: 2,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
        }}>🧠</div>
      )}
      <div style={{
        maxWidth: '82%', padding: '10px 13px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1c2a47',
        color: '#f0f4ff', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content || <TypingDot />}
      </div>
    </div>
  )
}

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)

    // Placeholder for streaming
    setMessages((m) => [...m, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let assistant = ''
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.text) {
              assistant += parsed.text
              setMessages((m) => {
                const updated = [...m]
                updated[updated.length - 1] = { role: 'assistant', content: assistant }
                return updated
              })
            }
          } catch { /* ignore */ }
        }
      }

      if (!assistant) {
        setMessages((m) => {
          const updated = [...m]
          updated[updated.length - 1] = { role: 'assistant', content: '⚠️ No response — check that Ollama is running.' }
          return updated
        })
      }

      if (!open) setUnread((u) => u + 1)
    } catch {
      setMessages((m) => {
        const updated = [...m]
        updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Could not reach AI. Make sure Ollama is running on port 11434.' }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, open])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              width: 370, height: 520, background: '#0c1220',
              border: '1px solid #1c2a47', borderRadius: 18,
              boxShadow: '0 24px 64px rgba(0,0,0,.7)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
              borderBottom: '1px solid #1c2a47', background: '#0f1629', flexShrink: 0,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                boxShadow: '0 0 14px rgba(99,102,241,.4)',
              }}>🧠</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>CreatorOS AI</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {loading ? '✍️ Thinking…' : '● Live · Powered by local AI'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    title="Clear chat"
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: '4px 6px', borderRadius: 6 }}
                  >
                    ↺
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', scrollbarWidth: 'thin' }}>
              {messages.length === 0 ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🧠</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Ask me anything about your content</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.5 }}>
                      I have full context of your reels, analytics, competitor data, and content calendar.
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => send(s)} disabled={loading}
                        style={{
                          textAlign: 'left', padding: '9px 13px', background: '#131d35',
                          border: '1px solid #1c2a47', borderRadius: 10, cursor: 'pointer',
                          fontSize: 12.5, color: '#94a3b8', transition: 'all .15s',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #1c2a47', background: '#0a1020', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Ask about your content…"
                  disabled={loading}
                  style={{
                    flex: 1, padding: '9px 12px',
                    background: '#131d35', border: '1px solid #1c2a47', borderRadius: 10,
                    color: '#f0f4ff', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0,
                    background: (!input.trim() || loading) ? '#1c2a47' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: (!input.trim() || loading) ? '#64748b' : '#fff',
                    cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                    fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                  }}
                >
                  ↑
                </button>
              </div>
              <div style={{ fontSize: 10, color: '#334155', marginTop: 6, textAlign: 'center' }}>
                Powered by {process.env.NEXT_PUBLIC_LOCAL_AI_MODEL ?? 'local AI'} · All data stays on your machine
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open ? '#1c2a47' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? 'none' : '0 4px 24px rgba(99,102,241,.5)',
          transition: 'background .2s, box-shadow .2s', position: 'relative',
        }}
      >
        {open ? '×' : '🧠'}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, width: 18, height: 18,
            background: '#ef4444', borderRadius: '50%', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #07090f',
          }}>{unread}</span>
        )}
      </motion.button>
    </div>
  )
}
