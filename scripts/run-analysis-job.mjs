const baseUrl = process.env.CREATOR_DASHBOARD_URL || 'http://127.0.0.1:3000'
const token = process.env.API_AUTH_TOKEN || ''

const headers = { 'Content-Type': 'application/json' }
if (token) headers.Authorization = `Bearer ${token}`

const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/analyze`, {
  method: 'POST',
  headers,
  body: JSON.stringify({}),
  signal: AbortSignal.timeout(900_000),
})

const text = await res.text()
if (!res.ok) {
  console.error(text)
  process.exit(1)
}

console.log(text)
