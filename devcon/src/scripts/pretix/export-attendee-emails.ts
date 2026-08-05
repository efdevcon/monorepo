/**
 * Export every attendee email across all paid Pretix orders for the event.
 *
 * Unlike export-early-bird-emails.ts (voucher-scoped), this lists the full
 * paid-order book — the recipient source for the pre-conference "install the
 * app" reminder (see send-install-reminder.ts).
 *
 * Read-only: makes no changes in Pretix.
 *
 * Usage:
 *   pnpm run pretix:export-attendee-emails
 *   pnpm run pretix:export-attendee-emails -- --out /tmp/attendees.csv
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { TICKETING, TICKETING_ENV, getPretixApiToken } from '../../config/ticketing'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : url + '/'
  if (!normalized.includes('/api/')) {
    normalized = normalized + 'api/v1/'
  }
  return normalized
}

const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
const org = TICKETING.pretix.organizer
const ev = TICKETING.pretix.event
const token = getPretixApiToken()

const headers: Record<string, string> = {
  Authorization: 'Token ' + token,
  'Content-Type': 'application/json',
}

function eventUrl(endpoint: string): string {
  return baseUrl + 'organizers/' + org + '/events/' + ev + endpoint
}

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const outPath = argValue('--out') ?? `generated-codes/attendee-emails-${new Date().toISOString().slice(0, 10)}.csv`

interface PretixPosition {
  attendee_name: string | null
  attendee_email: string | null
  addon_to: number | null
}

interface PretixOrder {
  code: string
  email: string
  positions: PretixPosition[]
}

interface Attendee {
  email: string
  name: string
}

/** Fetch every attendee across all paid orders (handles pagination). */
async function fetchAllPaidAttendees(): Promise<Attendee[]> {
  const byEmail = new Map<string, Attendee>()
  let url: string | null = eventUrl('/orders/') + '?status=p'

  while (url) {
    const res: Response = await fetch(url, { headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Pretix API error ${res.status}: ${text}`)
    }
    const data = await res.json()
    const orders: PretixOrder[] = data.results ?? []

    for (const order of orders) {
      // Real tickets are non-add-on positions (same rule the app itself uses
      // when looking up a signed-in user's own tickets).
      const ticketPositions = (order.positions ?? []).filter(p => !p.addon_to)
      for (const position of ticketPositions) {
        const email = (position.attendee_email || order.email || '').toLowerCase().trim()
        if (!email || byEmail.has(email)) continue
        byEmail.set(email, { email, name: position.attendee_name || '' })
      }
    }

    url = data.next
  }

  return Array.from(byEmail.values())
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
}

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('Environment:', TICKETING_ENV)
  console.log('')

  console.log('Fetching all paid orders from Pretix...')
  const attendees = await fetchAllPaidAttendees()
  console.log(`  ${attendees.length} unique attendee emails across all paid orders`)
  console.log('')

  const lines = ['email,name']
  for (const a of attendees) {
    lines.push([a.email, a.name].map(csvEscape).join(','))
  }

  const outDir = path.dirname(outPath)
  if (outDir && outDir !== '.') fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outPath, lines.join('\n') + '\n')

  console.log(`CSV written to: ${outPath}`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
