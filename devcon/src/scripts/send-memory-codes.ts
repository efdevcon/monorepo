/**
 * Email every checked-in Devcon 8 attendee their Devcon 8 Memory code: a link
 * to the survey page (devcon.org/form/devcon-8-survey) that mints the free NFT
 * to the wallet they connect there (`[memory]` field, api/memory).
 *
 * One code per checked-in admission ticket (read live from Pretix), derived
 * from the ticket secret with MEMORY_CODE_SECRET (services/memory/codes.ts), so
 * every run rebuilds the same codes. Only each code's SHA-256 is stored, in
 * devcon8_memory_codes, together with the ticket's memory key. The link
 * carries the code as `code=`, a query parameter devcon.org's Matomo setup
 * excludes; the survey clears it from the address bar once read.
 * Tickets go to their attendee email, else the order email; someone holding
 * several gets one email with a link per ticket.
 *
 * SAFE BY DEFAULT: without --send or --test-to this is a dry run: nothing is
 * stored, no SMTP connection is made. It prints the recipients and writes a
 * rendered .html preview to generated-codes/previews/.
 *
 * Usage (NEXT_PUBLIC_PRETIX_ENV=production for the real event):
 *   pnpm run send-memory-codes                                       # dry run + preview
 *   pnpm run send-memory-codes -- --test-to you@example.com          # ONE test email to you, sample code (not stored)
 *   pnpm run send-memory-codes -- --test-to you@example.com --as attendee@example.com
 *                                                                    # ONE test email to you with that attendee's real codes
 *                                                                    # (stored, so the link works; not marked sent)
 *   pnpm run send-memory-codes -- --send                             # store codes and email everyone not emailed yet
 *   pnpm run send-memory-codes -- --send --limit 20                  # the first 20 only
 *
 * Re-running --send skips anyone already emailed (emailed_at in the table), so
 * a partial run resumes on its own and attendees checked in later get theirs.
 * Nothing personal is stored: the table keeps one-way values only (code hash,
 * ticket key), names and emails are read from Pretix each run, and the results
 * file counts sends without addresses.
 * Results: generated-codes/memory-codes-results-<timestamp>.csv (n,tickets,status).
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { getTransporter, sendWithRetry, DEFAULT_FROM } from '../services/mailer'
import { EMAIL_HEADER_ROW, EMAIL_COLOR_SCHEME_META, emailEyebrow } from '../services/emailLayout'
import { TICKETING, TICKETING_ENV, getPretixApiToken } from '../config/ticketing'
import { deriveCode, hashCode } from '../services/memory/codes'
import { formatCode } from '../services/memory/memory'
import { memoryTicketKey } from '../services/memory/state'

// ---- Campaign copy ----
const SUBJECT = 'Your Devcon 8 Memory is ready to mint 💜'
const SURVEY_URL = 'https://devcon.org/form/devcon-8-survey/'
const MATOMO_PARAMS = 'mtm_campaign=devcon8-memory&mtm_source=email&mtm_medium=email'
const mintLink = (code: string) => `${SURVEY_URL}?${MATOMO_PARAMS}&code=${formatCode(code)}`

// ---- CLI ----
function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}
const doSend = process.argv.includes('--send')
const testTo = argValue('--test-to')
const testAs = argValue('--as')
const limit = argValue('--limit') ? Number(argValue('--limit')) : null

const CODE_SECRET = process.env.MEMORY_CODE_SECRET
if (!CODE_SECRET) throw new Error('MEMORY_CODE_SECRET is not set (devcon/.env)')

// ---- Pretix (read-only; same access pattern as send-attendee-email-reminder.ts) ----
function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : url + '/'
  if (!normalized.includes('/api/')) normalized = normalized + 'api/v1/'
  return normalized
}
const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
const headers: Record<string, string> = {
  Authorization: 'Token ' + getPretixApiToken(),
  'Content-Type': 'application/json',
}
const eventUrl = (endpoint: string) =>
  baseUrl + 'organizers/' + TICKETING.pretix.organizer + '/events/' + TICKETING.pretix.event + endpoint

interface PretixPosition {
  secret: string
  item: number
  addon_to: number | null
  canceled?: boolean
  attendee_name: string | null
  attendee_email: string | null
  checkins?: unknown[]
}
interface PretixOrder {
  code: string
  email: string
  testmode?: boolean
  positions: PretixPosition[]
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Pretix API error ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}

async function fetchAdmissionItemIds(): Promise<Set<number>> {
  const data = await getJson<{ results: { id: number; admission?: boolean }[] }>(eventUrl('/items/'))
  return new Set(data.results.filter(item => item.admission !== false).map(item => item.id))
}

async function fetchPaidOrders(): Promise<PretixOrder[]> {
  const orders: PretixOrder[] = []
  let url: string | null = eventUrl('/orders/') + '?status=p'
  while (url) {
    const data: { results: PretixOrder[]; next: string | null } = await getJson(url)
    orders.push(...data.results)
    url = data.next
  }
  return orders
}

interface Ticket {
  code: string
  ticketKey: string
  name: string | null
}
interface Recipient {
  email: string
  tickets: Ticket[]
}

/** Checked-in admission tickets of paid, non-test orders, grouped by the email they go to. */
export function selectRecipients(orders: PretixOrder[], admissionItems: Set<number>): Recipient[] {
  const byEmail = new Map<string, Recipient>()
  for (const order of orders) {
    if (order.testmode) continue
    for (const p of order.positions ?? []) {
      if (p.addon_to || p.canceled || !admissionItems.has(p.item) || !p.checkins?.length) continue
      const email = (p.attendee_email || order.email || '').trim().toLowerCase()
      if (!email) continue
      const entry = byEmail.get(email) ?? { email, tickets: [] }
      entry.tickets.push({
        code: deriveCode(CODE_SECRET!, p.secret),
        ticketKey: memoryTicketKey(p.secret),
        name: p.attendee_name?.trim() || null,
      })
      byEmail.set(email, entry)
    }
  }
  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email))
}

// ---- Email ----
function buildHtml(recipient: Recipient, testBanner = false): string {
  const several = recipient.tickets.length > 1
  const button = (t: Ticket, i: number) => `
              <div style="text-align: center; margin-bottom: 12px;">
                <a href="${mintLink(
                  t.code
                )}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #fffffe; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  ${several ? `Mint the memory for ${t.name ?? `ticket ${i + 1}`}` : 'Mint your memory'}
                </a>
              </div>`
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${EMAIL_COLOR_SCHEME_META}
  <title>Your Devcon 8 Memory</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
${EMAIL_HEADER_ROW}
          <tr>
            <td style="padding: 32px;">
${emailEyebrow('Devcon 8 India')}
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #1a0d33; text-align: center;">
                Your Devcon 8 Memory
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                We loved having you at Devcon 8 in Mumbai. As a thank you, everyone who checked in can mint a
                Devcon 8 Memory: a free, symbolic commemorative NFT on Ethereum. There's no gas to pay.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                Open the link, connect your wallet and tap Mint. While you're there, tell us how Devcon 8 went:
                the same page has our feedback survey.
              </p>
${recipient.tickets.map(button).join('')}
              <p style="margin: 12px 0 0; font-size: 14px; line-height: 1.5; color: #594d73;">
                One memory per ticket. Your link is personal: please don't share it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                ${testBanner ? '[TEST EMAIL, not a real campaign send]<br />' : ''}
                You're receiving this because your Devcon 8 India ticket was checked in at the venue.<br />
                The Devcon Team 💜
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---- Codes table (service role) ----
function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
  return createClient(url, key)
}

/** Stores the recipient's codes as one-way values only (code hash + ticket key); existing rows are left as they are. */
async function storeCodes(client: ReturnType<typeof db>, r: Recipient): Promise<void> {
  const rows = r.tickets.map(t => ({ code_hash: hashCode(t.code), ticket_key: t.ticketKey }))
  const { error } = await client
    .from('devcon8_memory_codes')
    .upsert(rows, { onConflict: 'code_hash', ignoreDuplicates: true })
  if (error) throw new Error(`devcon8_memory_codes store: ${error.message}`)
}

async function emailedKeys(client: ReturnType<typeof db>): Promise<Set<string>> {
  const done = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('devcon8_memory_codes')
      .select('ticket_key')
      .not('emailed_at', 'is', null)
      .range(from, from + 999)
    if (error) throw new Error(`devcon8_memory_codes read: ${error.message}`)
    for (const row of data ?? []) done.add(row.ticket_key)
    if (!data || data.length < 1000) return done
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('Environment:', TICKETING_ENV)
  console.log('')
  console.log('Reading items and paid orders from Pretix (read-only)...')
  const [admissionItems, orders] = await Promise.all([fetchAdmissionItemIds(), fetchPaidOrders()])
  let recipients = selectRecipients(orders, admissionItems)
  const ticketCount = recipients.reduce((n, r) => n + r.tickets.length, 0)
  console.log(`  ${orders.length} paid orders, ${ticketCount} checked-in tickets, ${recipients.length} recipients`)
  console.log('')

  if (testTo) {
    const source = testAs ? recipients.find(r => r.email === testAs.toLowerCase()) : null
    if (testAs && !source) throw new Error(`--as ${testAs} has no checked-in ticket`)
    const sample: Recipient = {
      email: testTo,
      tickets: [{ code: deriveCode(CODE_SECRET!, 'sample-ticket'), ticketKey: '', name: null }],
    }
    const recipient = source ? { ...source, email: testTo } : sample
    if (source) await storeCodes(db(), source)
    console.log(
      `*** TEST: sending ONE email to ${testTo} (${
        source ? `codes of ${testAs}, stored` : 'sample code, not stored'
      }) ***`
    )
    await sendWithRetry(getTransporter(), {
      from: DEFAULT_FROM,
      to: testTo,
      subject: `[TEST] ${SUBJECT}`,
      html: buildHtml(recipient, true),
    })
    console.log('Sent. Nothing else was sent.')
    return
  }

  if (!doSend) {
    const dir = path.join('generated-codes', 'previews')
    fs.mkdirSync(dir, { recursive: true })
    const example = recipients.find(r => r.tickets.length > 1) ?? recipients[0]
    if (example) {
      const file = path.join(dir, 'memory-codes-preview.html')
      fs.writeFileSync(file, buildHtml({ ...example, email: 'preview@example.com' }, true))
      console.log(`Preview: ${file}`)
    }
    console.log(`DRY RUN: ${recipients.length} emails would go out (${ticketCount} codes). Nothing stored or sent.`)
    console.log('Run with --test-to you@example.com first, then --send.')
    return
  }

  const client = db()
  const done = await emailedKeys(client)
  recipients = recipients
    .map(r => ({ ...r, tickets: r.tickets.filter(t => !done.has(t.ticketKey)) }))
    .filter(r => r.tickets.length > 0)
  console.log(`Already emailed: ${done.size} tickets. To send now: ${recipients.length} emails.`)
  if (limit !== null && Number.isFinite(limit)) recipients = recipients.slice(0, limit)

  const results = path.join(
    'generated-codes',
    `memory-codes-results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
  )
  fs.mkdirSync('generated-codes', { recursive: true })
  fs.writeFileSync(results, 'n,tickets,status\n')
  const transporter = getTransporter()
  let sent = 0
  for (const [i, r] of recipients.entries()) {
    try {
      await storeCodes(client, r)
      await sendWithRetry(transporter, { from: DEFAULT_FROM, to: r.email, subject: SUBJECT, html: buildHtml(r) })
      const { error } = await client
        .from('devcon8_memory_codes')
        .update({ emailed_at: new Date().toISOString() })
        .in(
          'ticket_key',
          r.tickets.map(t => t.ticketKey)
        )
      if (error) throw new Error(`mark emailed: ${error.message}`)
      fs.appendFileSync(results, `${i + 1},${r.tickets.length},sent\n`)
      sent++
      console.log(`  [${i + 1}/${recipients.length}] sent`)
    } catch (err) {
      // A re-run retries it: only sent emails are marked in the table.
      fs.appendFileSync(results, `${i + 1},${r.tickets.length},failed\n`)
      console.error(`  [${i + 1}/${recipients.length}] FAILED`, err)
    }
    if (i < recipients.length - 1) await sleep(300)
  }
  console.log(`\nDone: ${sent}/${recipients.length} sent. Results: ${results}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
