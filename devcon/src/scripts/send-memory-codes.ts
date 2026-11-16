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
const SUBJECT = 'Tell us about Devcon 8 (and mint your onchain Memory) ✨'
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

/**
 * Admission products that still get no memory, by their English name (the same in the test and live Pretix,
 * unlike ids): under-3 children, the email-testing product, and replacement wristbands (their holder already has
 * a ticket, so a second memory would be a duplicate).
 */
const EXCLUDED_PRODUCTS = new Set(['Child (Under 3) with Adult', 'Email Testing', 'Lost Wristband', 'Lost India Wristband'])

async function fetchAdmissionItemIds(): Promise<Set<number>> {
  type Item = { id: number; admission?: boolean; name?: string | Record<string, string> }
  const ids = new Set<number>()
  const excludedFound = new Set<string>()
  // Every page: Pretix returns 50 products per page.
  let url: string | null = eventUrl('/items/')
  while (url) {
    const page: { next: string | null; results: Item[] } = await getJson(url)
    for (const item of page.results) {
      const name = (typeof item.name === 'string' ? item.name : item.name?.en ?? '').trim()
      if (EXCLUDED_PRODUCTS.has(name)) excludedFound.add(name)
      else if (item.admission !== false) ids.add(item.id)
    }
    url = page.next
  }
  // A renamed product would silently stop being excluded: say so.
  for (const name of EXCLUDED_PRODUCTS) if (!excludedFound.has(name)) console.warn(`Excluded product not found in Pretix: "${name}"`)
  return ids
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
                  ${several ? `Share your feedback and mint for ${t.name ?? `ticket ${i + 1}`}` : 'Share your feedback and mint your memory'}
                </a>
              </div>`
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${EMAIL_COLOR_SCHEME_META}
  <title>Tell us about Devcon 8</title>
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
                Hello, Devcon family!
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                We hope you're enjoying some time to relax after joining us in Mumbai. Whether you've flown home and
                are getting settled, or you're still exploring the region, we hope Devcon left you glowing like Diwali
                lights. ✨🪔
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                We'd love to hear about your experience. Your feedback helps us make future Devcons better, and it
                takes about 5 minutes.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                As a thank you for being part of Devcon 8, you can also mint your Devcon 8 Memory: a free, symbolic
                commemorative NFT on Ethereum that marks your time with us in Mumbai. Connect your wallet, sign a free
                message, and that's it. You can mint whether you fill in the survey or not.
              </p>
${recipient.tickets.map(button).join('')}
              <p style="margin: 12px 0 0; font-size: 14px; line-height: 1.5; color: #594d73;">
                One memory per ticket. Your link is personal: please don't share it.
              </p>
              <p style="margin: 8px 0 0; font-size: 14px; line-height: 1.5; color: #594d73;">
                PS: We will never ask for your seed phrase or private key, and this link only goes to devcon.org.
              </p>
              <p style="margin: 24px 0 0; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                Thank you for lighting up Devcon 8 with us. See you in Lisbon!
              </p>
              <p style="margin: 16px 0 0; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                With gratitude,<br />
                The Devcon Team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                ${testBanner ? '[TEST EMAIL, not a real campaign send]<br />' : ''}
                You're receiving this because your Devcon 8 India ticket was checked in at the venue.
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

/** Retries of one email when SES says the send rate is exceeded (waits 2, 4, 8, 16, 32 s). */
const RATE_RETRIES = 5

/** The SES refusals the run acts on: the daily quota ends it (re-run later), the send rate is waited out. */
function sesLimit(err: unknown): 'quota' | 'rate' | null {
  const text = err instanceof Error ? `${(err as { response?: string }).response ?? ''} ${err.message}` : String(err)
  if (/daily message quota exceeded/i.test(text)) return 'quota'
  if (/maximum sending rate exceeded/i.test(text)) return 'rate'
  return null
}

/** A short reason for the results file, with any email address masked. */
function failureReason(err: unknown): string {
  const text = err instanceof Error ? (err as { response?: string }).response || err.message : String(err)
  return text
    .replace(/[^\s,;<>"]+@[^\s,;<>"]+/g, '<address>')
    .replace(/[\r\n,"]+/g, ' ')
    .trim()
    .slice(0, 160)
}

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
  fs.writeFileSync(results, 'n,tickets,status,error\n')
  const transporter = getTransporter()
  let sent = 0
  for (const [i, r] of recipients.entries()) {
    try {
      await storeCodes(client, r)
      for (let attempt = 0; ; attempt++) {
        try {
          await sendWithRetry(transporter, { from: DEFAULT_FROM, to: r.email, subject: SUBJECT, html: buildHtml(r) })
          break
        } catch (err) {
          if (sesLimit(err) !== 'rate' || attempt >= RATE_RETRIES) throw err
          const wait = 2000 * 2 ** attempt
          console.warn(`  [${i + 1}/${recipients.length}] SES send rate exceeded, retrying in ${wait / 1000} s`)
          await sleep(wait)
        }
      }
      const { error } = await client
        .from('devcon8_memory_codes')
        .update({ emailed_at: new Date().toISOString() })
        .in(
          'ticket_key',
          r.tickets.map(t => t.ticketKey)
        )
      if (error) throw new Error(`mark emailed: ${error.message}`)
      fs.appendFileSync(results, `${i + 1},${r.tickets.length},sent,\n`)
      sent++
      console.log(`  [${i + 1}/${recipients.length}] sent`)
    } catch (err) {
      // A re-run retries it: only sent emails are marked in the table.
      const reason = failureReason(err)
      fs.appendFileSync(results, `${i + 1},${r.tickets.length},failed,${reason}\n`)
      console.error(`  [${i + 1}/${recipients.length}] FAILED: ${reason}`)
      if (sesLimit(err) === 'quota') {
        console.error(
          `\nSES daily sending quota reached: stopping. Run --send again later (the quota resets over 24 hours); it skips everyone already emailed.`
        )
        break
      }
    }
    if (i < recipients.length - 1) await sleep(300)
  }
  console.log(`\nDone: ${sent}/${recipients.length} sent. Results: ${results}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
