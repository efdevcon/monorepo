/**
 * Remind buyers who hold several Devcon 8 India tickets under their own email
 * to give each ticket its attendee's email in Pretix.
 *
 * Why: the event app signs people in by email and shows the tickets carrying
 * that email. A buyer who typed their own address on every ticket sees a pile
 * of QR codes and has to pick theirs in the app, while their colleagues sign
 * in and find nothing. When each ticket carries its holder's email, everyone
 * signs in and finds their ticket already there. The app handles what is left
 * on the day (select or QR upload); this email shrinks that case up front.
 *
 * Recipients (read live from Pretix, nothing to export first): buyers whose
 * paid, non-test orders together still hold TWO OR MORE admission tickets whose
 * attendee email is empty or equal to the order email (the same rule as the
 * app's "Bought tickets for others?" nudge: counted across orders, since at
 * most one of those tickets is the buyer's own). One email per buyer, listing
 * every such order with a button straight to its "change details" form
 * (<order url>/modify). Re-run a week later and only whoever still qualifies
 * is picked up again.
 *
 * Depends on Pretix allowing customers to change attendee details: setting
 * "Customers can modify their orders until" (last_order_modification_date)
 * must be unset or in the future. The dry run reminds you to check.
 *
 * SAFE BY DEFAULT: without --send or --test-to this is a dry run. No SMTP
 * connection is made. It prints the recipients and writes rendered .html
 * previews to generated-codes/previews/ for review in a browser.
 *
 * Usage:
 *   pnpm run send-attendee-email-reminder                                    # dry run + previews
 *   pnpm run send-attendee-email-reminder -- --test-to you@example.com       # ONE test email to you, sample data
 *   pnpm run send-attendee-email-reminder -- --test-to you@example.com --as buyer@example.com
 *                                                                           # ONE test email to you with that buyer's real orders
 *   pnpm run send-attendee-email-reminder -- --send                          # live send to every recipient
 *   pnpm run send-attendee-email-reminder -- --send --limit 5                # live send to the first 5 only
 *   add --skip-sent generated-codes/attendee-email-reminder-results-<ts>.csv to resume a partial run
 *
 * Results are written to generated-codes/attendee-email-reminder-results-<timestamp>.csv
 * (email,orders,status) so a partial run can be resumed with --skip-sent.
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { getTransporter, sendWithRetry, DEFAULT_FROM } from '../services/mailer'
import { EMAIL_HEADER_ROW, EMAIL_COLOR_SCHEME_META, emailEyebrow } from '../services/emailLayout'
import { TICKETING, TICKETING_ENV, getPretixApiToken, pretixEventUrl } from '../config/ticketing'

// ---- Campaign copy ----
const SUBJECT = '🎟️ Your Devcon 8 India tickets: who is using each one?'
const MATOMO_PARAMS = 'mtm_campaign=attendee-email-reminder&mtm_source=email&mtm_medium=email'

// ---- CLI ----
function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}
const doSend = process.argv.includes('--send')
const testTo = argValue('--test-to')
const testAs = argValue('--as')
const skipSentPath = argValue('--skip-sent')
const limit = argValue('--limit') ? Number(argValue('--limit')) : null

// ---- Pretix (read-only; same access pattern as pretix/export-attendee-emails.ts) ----
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

interface PretixItem {
  id: number
  admission?: boolean
}
interface PretixPosition {
  attendee_email: string | null
  addon_to: number | null
  canceled?: boolean
  item: number
}
interface PretixOrder {
  code: string
  email: string
  datetime: string
  testmode?: boolean
  url: string
  positions: PretixPosition[]
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Pretix API error ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}

async function fetchAdmissionItemIds(): Promise<Set<number>> {
  const data = await getJson<{ results: PretixItem[] }>(eventUrl('/items/'))
  // Tri-state like the app: only an explicit `admission: false` is merchandise.
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

// ---- Recipient selection ----
interface QualifyingOrder {
  code: string
  url: string
  /** Order placement time, for chronological listing (same order as the app). */
  datetime: string
  /** Admission tickets still carrying the buyer's email (or none). */
  ticketsWithBuyer: number
}
interface Recipient {
  email: string
  orders: QualifyingOrder[]
}

/**
 * Buyers whose orders together hold two or more admission tickets that still
 * carry the buyer's email (or no attendee email at all), with every order that
 * holds at least one. Same rule as the app's buyer nudge. Pure, so it is easy
 * to read and to check by hand against a Pretix export.
 */
export function selectRecipients(orders: PretixOrder[], admissionItems: Set<number>): Recipient[] {
  const byEmail = new Map<string, Recipient>()
  for (const order of orders) {
    if (order.testmode) continue
    const buyer = (order.email || '').trim().toLowerCase()
    if (!buyer) continue
    const ticketsWithBuyer = (order.positions ?? []).filter(
      p =>
        !p.addon_to &&
        !p.canceled &&
        admissionItems.has(p.item) &&
        (!p.attendee_email || p.attendee_email.trim().toLowerCase() === buyer)
    ).length
    if (ticketsWithBuyer === 0) continue
    const entry = byEmail.get(buyer) ?? { email: buyer, orders: [] }
    entry.orders.push({ code: order.code, url: order.url, datetime: order.datetime, ticketsWithBuyer })
    byEmail.set(buyer, entry)
  }
  return Array.from(byEmail.values())
    .filter(r => r.orders.reduce((n, o) => n + o.ticketsWithBuyer, 0) >= 2)
    .map(r => ({ ...r, orders: [...r.orders].sort((a, b) => a.datetime.localeCompare(b.datetime) || a.code.localeCompare(b.code)) }))
    .sort((a, b) => a.email.localeCompare(b.email))
}

// ---- Email ----
/** The order's "change details" form (attendee emails), straight from the button. */
const modifyLink = (orderUrl: string) => `${orderUrl.replace(/\/?$/, '/')}modify?${MATOMO_PARAMS}`

function buildReminderHtml(recipient: Recipient, testBanner = false): string {
  const total = recipient.orders.reduce((sum, order) => sum + order.ticketsWithBuyer, 0)
  const several = recipient.orders.length > 1
  const intro = several
    ? `your orders below hold <strong>${total} tickets</strong> that are all under your email.`
    : `your order <strong>${recipient.orders[0].code}</strong> holds <strong>${total} tickets</strong> that are all under your email.`
  const buttons = recipient.orders
    .map(
      order => `
              <div style="text-align: center; margin-bottom: 12px;">
                <a href="${modifyLink(order.url)}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #fffffe; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  ${several ? `Update order ${order.code}` : 'Update attendee emails'}
                </a>
              </div>`
    )
    .join('')
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${EMAIL_COLOR_SCHEME_META}
  <title>Who is using each of your Devcon 8 India tickets?</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
${EMAIL_HEADER_ROW}
          <tr>
            <td style="padding: 32px;">
${emailEyebrow('Your Devcon 8 India tickets')}
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #1a0d33; text-align: center;">
                Who is using each ticket?
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                Hi, ${intro}
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                Each attendee signs in to the Devcon app with the email on their ticket: that is where
                their QR code, their schedule and their swag live. If some of these tickets are for
                colleagues or friends, add their email to their ticket now and it will be waiting for
                them when they sign in.
              </p>
${buttons}
              <p style="margin: 12px 0 0; font-size: 14px; line-height: 1.5; color: #594d73;">
                If every ticket is yours, there is nothing to do.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                ${testBanner ? '[TEST EMAIL, not a real campaign send]<br />' : ''}
                You're receiving this because you bought several Devcon 8 India tickets.<br />
                See you in Mumbai! 🇮🇳 The Devcon Team 💜
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

/** Emails already marked sent in a previous results CSV (for --skip-sent). */
function loadAlreadySent(file: string): Set<string> {
  const sent = new Set<string>()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const cells = line.split(',')
    if (cells[cells.length - 1]?.trim() === 'sent') sent.add(cells[0]?.trim().toLowerCase())
  }
  return sent
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Sample content for a --test-to run without --as: no real buyer involved. */
function sampleRecipient(to: string): Recipient {
  return {
    email: to,
    orders: [
      { code: 'ABCDE', url: pretixEventUrl('/order/ABCDE/sample/'), datetime: '2026-06-01T10:00:00Z', ticketsWithBuyer: 3 },
      { code: 'FGHIJ', url: pretixEventUrl('/order/FGHIJ/sample/'), datetime: '2026-07-01T10:00:00Z', ticketsWithBuyer: 2 },
    ],
  }
}

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('Environment:', TICKETING_ENV)
  console.log('')

  console.log('Reading items and paid orders from Pretix (read-only)...')
  const [admissionItems, orders] = await Promise.all([fetchAdmissionItemIds(), fetchPaidOrders()])
  let recipients = selectRecipients(orders, admissionItems)
  const ticketsTotal = recipients.reduce((n, r) => n + r.orders.reduce((m, o) => m + o.ticketsWithBuyer, 0), 0)
  console.log(`  ${orders.length} paid orders, ${recipients.length} buyers hold ${ticketsTotal} tickets still under their own email (2+ in total)`)
  console.log('')

  if (skipSentPath) {
    const done = loadAlreadySent(skipSentPath)
    const before = recipients.length
    recipients = recipients.filter(r => !done.has(r.email))
    console.log(`--skip-sent: ${before - recipients.length} already sent, ${recipients.length} remaining`)
  }
  if (limit !== null && Number.isFinite(limit)) {
    recipients = recipients.slice(0, limit)
    console.log(`--limit: ${recipients.length} recipient(s)`)
  }

  // ---- ONE test email to a chosen inbox ----
  if (testTo) {
    const source = testAs ? recipients.find(r => r.email === testAs.toLowerCase()) : null
    if (testAs && !source) throw new Error(`--as ${testAs} is not among the recipients`)
    const recipient: Recipient = source ? { ...source, email: testTo } : sampleRecipient(testTo)
    console.log(`*** TEST: sending ONE email to ${testTo} (${source ? `content of ${testAs}` : 'sample content'}) ***`)
    const transporter = getTransporter()
    await sendWithRetry(transporter, { from: DEFAULT_FROM, to: testTo, subject: `[TEST] ${SUBJECT}`, html: buildReminderHtml(recipient, true) })
    console.log('Sent. Nothing else was sent.')
    return
  }

  // ---- DRY RUN ----
  if (!doSend) {
    const previewDir = 'generated-codes/previews'
    fs.mkdirSync(previewDir, { recursive: true })
    for (const r of recipients.slice(0, 20)) {
      const safeName = r.email.replace(/[^a-z0-9.@-]/gi, '_')
      fs.writeFileSync(path.join(previewDir, `attendee-email-reminder-${safeName}.html`), buildReminderHtml(r))
    }
    // A preview with made-up data too, safe to open or share without exposing a buyer.
    fs.writeFileSync(path.join(previewDir, 'attendee-email-reminder-SAMPLE.html'), buildReminderHtml(sampleRecipient('you@example.com'), true))
    const listPath = `generated-codes/attendee-email-reminder-recipients-${new Date().toISOString().slice(0, 10)}.csv`
    fs.writeFileSync(listPath, 'email,orders,tickets\n' + recipients.map(r => `${r.email},${r.orders.map(o => o.code).join(' ')},${r.orders.reduce((n, o) => n + o.ticketsWithBuyer, 0)}`).join('\n') + '\n')
    console.log('*** DRY RUN: no emails sent ***')
    console.log(`Subject: ${SUBJECT}`)
    console.log('')
    for (const r of recipients) {
      console.log(`  ${r.email}  ${r.orders.map(o => `${o.code} (${o.ticketsWithBuyer} tickets)`).join(', ')}`)
    }
    console.log('')
    console.log(`Recipient list: ${listPath}`)
    console.log(`Up to 20 HTML previews written to ${previewDir}/attendee-email-reminder-*.html (plus -SAMPLE.html with made-up data)`)
    console.log('Check in Pretix that customers may change attendee details ("Customers can modify their')
    console.log('orders until" unset or in the future), then --test-to you@example.com for one test email,')
    console.log('or --send for the full list.')
    return
  }

  // ---- LIVE SEND ----
  console.log(`*** LIVE SEND to ${recipients.length} recipient(s) ***`)
  console.log(`Subject: ${SUBJECT}`)
  console.log('')
  const transporter = getTransporter()
  const resultsPath = `generated-codes/attendee-email-reminder-results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
  fs.writeFileSync(resultsPath, 'email,orders,status\n')

  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]
    const codes = r.orders.map(o => o.code).join(' ')
    try {
      await sendWithRetry(transporter, { from: DEFAULT_FROM, to: r.email, subject: SUBJECT, html: buildReminderHtml(r) })
      fs.appendFileSync(resultsPath, `${r.email},${codes},sent\n`)
      console.log(`  [${i + 1}/${recipients.length}] sent -> ${r.email} (${codes})`)
      sent++
    } catch (err) {
      fs.appendFileSync(resultsPath, `${r.email},${codes},failed\n`)
      console.error(`  [${i + 1}/${recipients.length}] FAILED ${r.email}: ${(err as Error).message}`)
      failed++
    }
    if (i < recipients.length - 1) await sleep(300)
  }

  console.log('')
  console.log('=== Summary ===')
  console.log(`  Sent:    ${sent}`)
  console.log(`  Failed:  ${failed}`)
  console.log(`  Results: ${resultsPath}`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
