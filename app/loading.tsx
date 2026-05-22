export default function Loading() {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 'calc(100vw - 230px)' }}>
      <div style={{ height: 28, width: 220, background: '#1c2a47', borderRadius: 8, marginBottom: 8, animation: 'pulse 2s infinite' }} />
      <div style={{ height: 14, width: 180, background: '#131d35', borderRadius: 6, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 120, background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, animation: 'pulse 2s infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div style={{ height: 240, background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, marginBottom: 20, animation: 'pulse 2s infinite' }} />
      <div style={{ height: 200, background: '#0f1629', border: '1px solid #1c2a47', borderRadius: 14, animation: 'pulse 2s infinite' }} />
    </div>
  )
}
