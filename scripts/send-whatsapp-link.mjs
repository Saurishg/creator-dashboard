#!/usr/bin/env node
/**
 * Send the creator dashboard link to WhatsApp via wa-service.
 * Usage: node scripts/send-whatsapp-link.mjs [phone]
 * Falls back to WHATSAPP_NUMBER env var.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const phone = process.argv[2] || process.env.WHATSAPP_NUMBER
if (!phone) { console.error('No phone. Pass as arg or set WHATSAPP_NUMBER in .env.local'); process.exit(1) }

const url = process.env.CREATOR_DASHBOARD_URL || 'http://127.0.0.1:3000'
const waService = process.env.WA_SERVICE_URL || 'http://127.0.0.1:3131'
const message = `📊 Creator Dashboard\n${url}`

const res = await fetch(`${waService}/send`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone, message }),
  signal: AbortSignal.timeout(30_000),
})
const body = await res.json()
if (body.ok) { console.log(`✓ Sent dashboard link to ${phone}`) }
else { console.error(`✗ ${body.error || 'Failed'}`); process.exit(1) }
