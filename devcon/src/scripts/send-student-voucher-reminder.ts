/**
 * Remind approved students whose discount voucher EXPIRED unused to redeem it,
 * after extending the voucher's validity to a new deadline.
 *
 * Why: student vouchers (Indian Students, International Students) were issued
 * in batches with a short validity. Many were never redeemed and have lapsed.
 * The team extends those to a common deadline and emails the holder once.
 *
 * Recipients (read live from Pretix): vouchers of the two student products that
 * are not fully redeemed and whose validity has passed, or that this script
 * already extended (marker in the voucher comment). The customer email is read
 * from the voucher comment, where the issuing flow wrote it. One email per
 * address, listing each of its vouchers with a redeem button. Holders whose
 * email already appears on a paid order (as buyer or attendee) already have a
 * ticket: their vouchers are neither extended nor emailed, without exception.
 *
 * Nothing is written to Pretix without --extend, nothing is emailed without
 * --send or --test-to. Run against production explicitly with
 * NEXT_PUBLIC_PRETIX_ENV=production, otherwise the development instance is read.
 *
 * Usage:
 *   pnpm run send-student-voucher-reminder                          # dry run: counts, recipients, previews
 *   pnpm run send-student-voucher-reminder -- --test-to you@example.com          # ONE test email, sample data
 *   pnpm run send-student-voucher-reminder -- --test-to you@example.com --as holder@example.com
 *   pnpm run send-student-voucher-reminder -- --extend                # extend the selected vouchers only
 *   pnpm run send-student-voucher-reminder -- --extend --send --limit 3          # extend + email the first 3
 *   pnpm run send-student-voucher-reminder -- --extend --send        # the full campaign
 *   add --skip-sent <results csv> (repeatable, one per earlier batch) to resume
 *
 * --send refuses vouchers that are still expired at send time (their link would
 * be dead), so run --extend first or together with --send. Results go to
 * generated-codes/student-voucher-reminder-results-<timestamp>.csv.
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { getTransporter, sendWithRetry, DEFAULT_FROM } from '../services/mailer'
import { EMAIL_HEADER_ROW, EMAIL_COLOR_SCHEME_META, emailEyebrow } from '../services/emailLayout'
import { TICKETING, TICKETING_ENV, discountItem, getPretixApiToken, pretixEventUrl } from '../config/ticketing'

// ---- Campaign settings ----
const SUBJECT = '🎓 Your Devcon 8 India student voucher is waiting: redeem it by October 31'
const MATOMO_PARAMS = 'mtm_campaign=student-voucher-reminder&mtm_source=email&mtm_medium=email'
/** New validity, end of day in India, like the vouchers were issued. */
const EXTEND_TO = '2026-10-31T23:59:00+05:30'
const DEADLINE_TEXT = 'October 31'
/** Appended to the voucher comment when extended, and used to re-select those vouchers later. */
const EXTENDED_MARKER = `Validity extended to ${EXTEND_TO.slice(0, 10)} for the redeem reminder.`
const PRODUCTS: { type: string; label: string }[] = [
  { type: 'indian-student', label: 'Indian Students 🇮🇳' },
  { type: 'international-student', label: 'International Students 🌍' },
]

// ---- CLI ----
function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}
const doExtend = process.argv.includes('--extend')
const doSend = process.argv.includes('--send')
const testTo = argValue('--test-to')
const testAs = argValue('--as')
/** Every --skip-sent <file>; results files of earlier batches, all of them. */
const skipSentPaths = process.argv.flatMap((a, i) =>
  a === '--skip-sent' && process.argv[i + 1] ? [process.argv[i + 1]] : []
)
const limit = argValue('--limit') ? Number(argValue('--limit')) : null

// ---- Pretix ----
const token = getPretixApiToken()
const headers = { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }
const apiBase = `${TICKETING.pretix.baseUrl.replace(/\/$/, '')}/api/v1/organizers/${
  TICKETING.pretix.organizer
}/events/${TICKETING.pretix.event}`
const eventUrl = (p: string) => `${apiBase}${p}`

interface PretixVoucher {
  id: number
  code: string
  max_usages: number
  redeemed: number
  valid_until: string | null
  item: number | null
  comment: string
  tag: string
  block_quota: boolean
}
interface PretixOrder {
  email: string | null
  testmode: boolean
  positions?: { attendee_email: string | null }[]
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Pretix API error ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}
async function getAll<T>(url: string): Promise<T[]> {
  const rows: T[] = []
  let next: string | null = url
  while (next) {
    const data: { results: T[]; next: string | null } = await getJson(next)
    rows.push(...data.results)
    next = data.next
  }
  return rows
}
async function fetchVouchers(item: number): Promise<PretixVoucher[]> {
  return getAll<PretixVoucher>(eventUrl(`/vouchers/?item=${item}&page_size=100`))
}
/** Every email on a paid, non-test order (buyer or attendee), lower-cased. */
async function fetchBuyerEmails(): Promise<Set<string>> {
  const orders = await getAll<PretixOrder>(eventUrl('/orders/?status=p&page_size=100'))
  const emails = new Set<string>()
  for (const o of orders) {
    if (o.testmode) continue
    if (o.email) emails.add(o.email.trim().toLowerCase())
    for (const p of o.positions ?? []) if (p.attendee_email) emails.add(p.attendee_email.trim().toLowerCase())
  }
  return emails
}
async function extendVoucher(v: PretixVoucher): Promise<void> {
  const comment = v.comment.includes(EXTENDED_MARKER) ? v.comment : `${v.comment.trim()} ${EXTENDED_MARKER}`.trim()
  const res = await fetch(eventUrl(`/vouchers/${v.id}/`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ valid_until: EXTEND_TO, comment }),
  })
  if (!res.ok) throw new Error(`Pretix API error ${res.status}: ${await res.text()}`)
}

// ---- Selection ----
interface VoucherRef {
  id: number
  code: string
  product: string
  validUntil: string | null
  /** True when the voucher cannot be redeemed right now. */
  expired: boolean
  extended: boolean
}
interface Recipient {
  email: string
  vouchers: VoucherRef[]
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const isExpired = (v: { valid_until: string | null }, now: number) =>
  !!v.valid_until && new Date(v.valid_until).getTime() < now

/**
 * One voucher per email address, chosen among the address's unredeemed vouchers
 * that have lapsed (or that this script already extended). Rules agreed with
 * the ticketing team:
 *   - an address that still holds an active voucher, or already redeemed one,
 *     gets nothing: it has, or had, its chance;
 *   - an address with several lapsed vouchers (applied twice) gets exactly one
 *     restored, the most recently issued; the others stay expired.
 * Pure, so it can be checked by hand against a Pretix voucher export.
 */
export function selectRecipients(
  vouchers: { voucher: PretixVoucher; product: string }[],
  now: number
): {
  recipients: Recipient[]
  noEmail: VoucherRef[]
  skippedActive: string[]
  skippedRedeemed: string[]
  duplicatesLeftExpired: VoucherRef[]
} {
  type Holder = { email: string; lapsed: VoucherRef[]; hasActive: boolean; hasRedeemed: boolean }
  const holders = new Map<string, Holder>()
  const noEmail: VoucherRef[] = []
  for (const { voucher: v, product } of vouchers) {
    const email = (v.comment || '').match(EMAIL_RE)?.[0].toLowerCase()
    const extended = (v.comment || '').includes(EXTENDED_MARKER)
    const expired = isExpired(v, now)
    const ref: VoucherRef = { id: v.id, code: v.code, product, validUntil: v.valid_until, expired, extended }
    if (!email) {
      if (v.redeemed < v.max_usages && (expired || extended)) noEmail.push(ref)
      continue
    }
    const h = holders.get(email) ?? { email, lapsed: [], hasActive: false, hasRedeemed: false }
    if (v.redeemed > 0) h.hasRedeemed = true
    else if (expired || extended) h.lapsed.push(ref)
    else h.hasActive = true // unredeemed, still valid, not one of ours
    holders.set(email, h)
  }
  const recipients: Recipient[] = []
  const skippedActive: string[] = []
  const skippedRedeemed: string[] = []
  const duplicatesLeftExpired: VoucherRef[] = []
  for (const h of holders.values()) {
    if (!h.lapsed.length) continue
    if (h.hasRedeemed) {
      skippedRedeemed.push(h.email)
      continue
    }
    if (h.hasActive) {
      skippedActive.push(h.email)
      continue
    }
    // Prefer the voucher already extended by an earlier run (stable across
    // reruns), otherwise the most recently issued one.
    const ranked = [...h.lapsed].sort(
      (x, y) =>
        Number(y.extended) - Number(x.extended) || (y.validUntil ?? '').localeCompare(x.validUntil ?? '') || y.id - x.id
    )
    recipients.push({ email: h.email, vouchers: [ranked[0]] })
    duplicatesLeftExpired.push(...ranked.slice(1))
  }
  recipients.sort((a, b) => a.email.localeCompare(b.email))
  return { recipients, noEmail, skippedActive, skippedRedeemed, duplicatesLeftExpired }
}

// ---- Email ----
const redeemLink = (code: string) => pretixEventUrl(`/redeem?voucher=${encodeURIComponent(code)}&${MATOMO_PARAMS}`)

function buildReminderHtml(recipient: Recipient, testBanner = false): string {
  const several = recipient.vouchers.length > 1
  const blocks = recipient.vouchers
    .map(
      v => `
              <div style="margin: 0 0 20px; padding: 20px; background: #f9f8fa; border-radius: 12px; text-align: center;">
                <p style="margin: 0 0 14px; font-size: 14px; color: #594d73;">${v.product}</p>
                <a href="${redeemLink(
                  v.code
                )}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #fffffe; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  Redeem my voucher
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
  <title>Redeem your Devcon 8 India student voucher by ${DEADLINE_TEXT}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
${EMAIL_HEADER_ROW}
          <tr>
            <td style="padding: 32px;">
${emailEyebrow('Your student discount')}
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #1a0d33; text-align: center;">
                Your voucher${several ? 's are' : ' is'} waiting for you
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                Hi there,
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                We're reaching out because you were approved for a discounted ticket to Devcon 8, but you
                have not redeemed your voucher yet! We have extended it: please redeem the voucher below by
                <strong>${DEADLINE_TEXT}</strong>. After that date it can no longer be used.
              </p>
${blocks}
              <p style="margin: 12px 0 0; font-size: 14px; line-height: 1.5; color: #594d73;">
                The button applies your voucher automatically. Your voucher is personal, tied to the
                email address you applied with, and can only be used once.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                ${testBanner ? '[TEST EMAIL, not a real campaign send]<br />' : ''}
                You're receiving this because your Devcon 8 student discount application was approved.<br />
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

// ---- Helpers ----
function loadAlreadySent(file: string): Set<string> {
  const sent = new Set<string>()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const cells = line.split(',')
    if (cells[cells.length - 1]?.trim() === 'sent') sent.add(cells[0]?.trim().toLowerCase())
  }
  return sent
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
function sampleRecipient(to: string): Recipient {
  return {
    email: to,
    vouchers: [
      { id: 0, code: 'SAMPLE-CODE', product: PRODUCTS[0].label, validUntil: EXTEND_TO, expired: false, extended: true },
    ],
  }
}
const countBy = <T>(rows: T[], key: (r: T) => string) =>
  rows.reduce<Record<string, number>>((acc, r) => ((acc[key(r)] = (acc[key(r)] ?? 0) + 1), acc), {})

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('Environment:', TICKETING_ENV)
  console.log('')

  console.log('Reading student vouchers and paid orders from Pretix (read-only)...')
  const now = Date.now()
  const pools: { voucher: PretixVoucher; product: string }[] = []
  for (const p of PRODUCTS) {
    const item = discountItem(p.type)
    if (!item) throw new Error(`No Pretix item configured for ${p.type} in ${TICKETING_ENV}`)
    const vouchers = await fetchVouchers(item)
    const unredeemed = vouchers.filter(v => v.redeemed < v.max_usages)
    const expired = unredeemed.filter(v => isExpired(v, now))
    console.log(
      `  ${p.label}: ${vouchers.length} vouchers, ${unredeemed.length} unredeemed, ${expired.length} of those expired`
    )
    const soon = unredeemed.filter(
      v => !isExpired(v, now) && v.valid_until && new Date(v.valid_until).getTime() < now + 24 * 3600 * 1000
    )
    if (soon.length)
      console.log(`    note: ${soon.length} unredeemed voucher(s) expire within 24 hours and are NOT selected yet`)
    pools.push(...vouchers.map(voucher => ({ voucher, product: p.label })))
  }
  const buyers = await fetchBuyerEmails()

  const selection = selectRecipients(pools, now)
  let { recipients } = selection
  const { noEmail, skippedActive, skippedRedeemed, duplicatesLeftExpired } = selection
  const selectedVouchers = recipients.flatMap(r => r.vouchers)
  console.log('')
  console.log(`Selected: ${selectedVouchers.length} voucher(s), one per address, for ${recipients.length} address(es)`)
  if (skippedActive.length) {
    console.log(`  ${skippedActive.length} address(es) still hold an active voucher: nothing restored for them`)
  }
  if (skippedRedeemed.length) {
    console.log(`  ${skippedRedeemed.length} address(es) already redeemed a voucher: nothing restored for them`)
  }
  if (duplicatesLeftExpired.length) {
    console.log(
      `  ${duplicatesLeftExpired.length} extra voucher(s) of addresses holding several stay expired (likely double applications):`
    )
    for (const v of duplicatesLeftExpired)
      console.log(`      ${v.code} (${v.product}, expired ${v.validUntil?.slice(0, 10)})`)
  }
  console.log(
    '  by original expiry:',
    JSON.stringify(countBy(selectedVouchers, v => v.validUntil?.slice(0, 10) ?? 'none'))
  )
  console.log(`  already extended by this script: ${selectedVouchers.filter(v => v.extended).length}`)
  if (noEmail.length) {
    console.log(`  ! ${noEmail.length} selected voucher(s) have no email in their comment and cannot be emailed:`)
    for (const v of noEmail) console.log(`      ${v.code} (${v.product}, expired ${v.validUntil?.slice(0, 10)})`)
  }
  const alreadyBought = recipients.filter(r => buyers.has(r.email))
  if (alreadyBought.length) {
    console.log(`  ${alreadyBought.length} holder(s) already have a paid ticket: no extension and no email for them:`)
    for (const r of alreadyBought) console.log(`      ${r.email}`)
    recipients = recipients.filter(r => !buyers.has(r.email))
  }
  if (skipSentPaths.length) {
    const done = new Set(skipSentPaths.flatMap(f => [...loadAlreadySent(f)]))
    const before = recipients.length
    recipients = recipients.filter(r => !done.has(r.email))
    console.log(`--skip-sent: ${before - recipients.length} already sent, ${recipients.length} remaining`)
  }
  if (limit !== null && Number.isFinite(limit)) {
    recipients = recipients.slice(0, limit)
    console.log(`--limit: ${recipients.length} recipient(s)`)
  }
  console.log('')

  // ---- ONE test email to a chosen inbox (no Pretix writes) ----
  if (testTo) {
    const source = testAs ? recipients.find(r => r.email === testAs.toLowerCase()) : null
    if (testAs && !source) throw new Error(`--as ${testAs} is not among the recipients`)
    const recipient: Recipient = source ? { ...source, email: testTo } : sampleRecipient(testTo)
    console.log(`*** TEST: sending ONE email to ${testTo} (${source ? `content of ${testAs}` : 'sample content'}) ***`)
    const transporter = getTransporter()
    await sendWithRetry(transporter, {
      from: DEFAULT_FROM,
      to: testTo,
      subject: `[TEST] ${SUBJECT}`,
      html: buildReminderHtml(recipient, true),
    })
    console.log('Sent. Nothing else was sent, nothing was changed in Pretix.')
    return
  }

  // ---- DRY RUN ----
  if (!doExtend && !doSend) {
    const previewDir = 'generated-codes/previews'
    fs.mkdirSync(previewDir, { recursive: true })
    for (const r of recipients.slice(0, 20)) {
      const safeName = r.email.replace(/[^a-z0-9.@-]/gi, '_')
      fs.writeFileSync(path.join(previewDir, `student-voucher-reminder-${safeName}.html`), buildReminderHtml(r))
    }
    fs.writeFileSync(
      path.join(previewDir, 'student-voucher-reminder-SAMPLE.html'),
      buildReminderHtml(sampleRecipient('you@example.com'), true)
    )
    const listPath = `generated-codes/student-voucher-reminder-recipients-${new Date().toISOString().slice(0, 10)}.csv`
    fs.writeFileSync(
      listPath,
      'email,codes,products,original_expiry\n' +
        recipients
          .map(
            r =>
              `${r.email},${r.vouchers.map(v => v.code).join(' ')},${r.vouchers
                .map(v => v.product)
                .join(' | ')},${r.vouchers.map(v => v.validUntil?.slice(0, 10)).join(' ')}`
          )
          .join('\n') +
        '\n'
    )
    console.log('*** DRY RUN: nothing changed in Pretix, no emails sent ***')
    console.log(`Subject: ${SUBJECT}`)
    console.log(
      `Would extend ${
        recipients.flatMap(r => r.vouchers).filter(v => !v.extended).length
      } voucher(s) to ${EXTEND_TO} and email ${recipients.length} address(es).`
    )
    console.log('')
    for (const r of recipients)
      console.log(
        `  ${r.email}  ${r.vouchers.map(v => `${v.code} (${v.product}, ${v.validUntil?.slice(0, 10)})`).join(', ')}`
      )
    console.log('')
    console.log(`Recipient list: ${listPath}`)
    console.log(
      `Up to 20 HTML previews written to ${previewDir}/student-voucher-reminder-*.html (plus -SAMPLE.html with made-up data)`
    )
    console.log(
      'Next: --test-to you@example.com for one test email, then --extend --send (add --limit N for a first batch).'
    )
    return
  }

  // ---- LIVE: extend, then send ----
  const resultsPath = `generated-codes/student-voucher-reminder-results-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.csv`
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
  fs.writeFileSync(resultsPath, 'email,codes,status\n')
  const record = (r: Recipient, status: string) =>
    fs.appendFileSync(resultsPath, `${r.email},${r.vouchers.map(v => v.code).join(' ')},${status}\n`)

  if (doExtend) {
    const todo = recipients.flatMap(r => r.vouchers.filter(v => !v.extended))
    console.log(`*** EXTENDING ${todo.length} voucher(s) to ${EXTEND_TO} ***`)
    const failedIds = new Set<number>()
    for (let i = 0; i < todo.length; i++) {
      const v = todo[i]
      const raw = pools.find(p => p.voucher.id === v.id)!.voucher
      try {
        await extendVoucher(raw)
        v.expired = false
        v.extended = true
        console.log(`  [${i + 1}/${todo.length}] extended ${v.code}`)
      } catch (err) {
        failedIds.add(v.id)
        console.error(`  [${i + 1}/${todo.length}] FAILED ${v.code}: ${(err as Error).message}`)
      }
      if (i < todo.length - 1) await sleep(150)
    }
    const failedRecipients = recipients.filter(r => r.vouchers.some(v => failedIds.has(v.id)))
    for (const r of failedRecipients) record(r, 'extend-failed')
    recipients = recipients.filter(r => !failedRecipients.includes(r))
    if (!doSend) {
      for (const r of recipients) record(r, 'extended')
      console.log('')
      console.log(
        `Extended. ${failedRecipients.length} recipient(s) had a failed extension. No emails sent. Results: ${resultsPath}`
      )
      return
    }
  }

  const stillExpired = recipients.filter(r => r.vouchers.some(v => v.expired))
  if (stillExpired.length) {
    console.log(
      `! ${stillExpired.length} recipient(s) still hold an expired voucher and are skipped: run with --extend first.`
    )
    for (const r of stillExpired) record(r, 'skipped-expired')
    recipients = recipients.filter(r => !stillExpired.includes(r))
  }

  console.log(`*** LIVE SEND to ${recipients.length} recipient(s) ***`)
  console.log(`Subject: ${SUBJECT}`)
  console.log('')
  const transporter = getTransporter()
  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]
    try {
      await sendWithRetry(transporter, {
        from: DEFAULT_FROM,
        to: r.email,
        subject: SUBJECT,
        html: buildReminderHtml(r),
      })
      record(r, 'sent')
      console.log(`  [${i + 1}/${recipients.length}] sent -> ${r.email}`)
      sent++
    } catch (err) {
      record(r, 'failed')
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
