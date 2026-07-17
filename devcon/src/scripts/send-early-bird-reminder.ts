/**
 * Send the "tickets are live" reminder to India Early Bird voucher holders
 *
 * Input: a `code,email` CSV (produced by pretix:export-early-bird-emails).
 * For each row, sends the reminder email (same SES SMTP infra + visual
 * template as the voucher-confirmation email in services/voucherEmail.ts)
 * with a direct Pretix redeem deep-link, tagged with Matomo campaign
 * parameters so clicks and funnel conversions attribute to this send.
 *
 * SAFE BY DEFAULT: without --send this is a dry run: no SMTP connection is
 * made. It prints the recipient list and writes rendered .html previews to
 * generated-codes/previews/ for review in a browser.
 *
 * Usage:
 *   pnpm run send-early-bird-reminder -- generated-codes/test.csv                    # dry run + previews
 *   pnpm run send-early-bird-reminder -- generated-codes/test.csv --test-to me@x.com # real send, all to one inbox
 *   pnpm run send-early-bird-reminder -- generated-codes/early-bird-emails-….csv --send
 *   …add --skip-sent generated-codes/reminder-results-….csv to resume a partial run
 *
 * Results are written to generated-codes/reminder-results-<timestamp>.csv
 * (code,email,status) so a partial failure can be resumed with --skip-sent.
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { getTransporter, sendWithRetry, DEFAULT_FROM } from '../services/mailer'
import { pretixEventUrl } from '../config/ticketing'

// ---- Campaign copy (India Early Bird, GA sale open) ----
const SUBJECT = '🎟️ Devcon India tickets are live: redeem your $99 Early Bird voucher'
const PRICE = '99'
// Sender comes from the shared mailer (DEFAULT_FROM), which matches the
// Pretix shop sender: "Devcon Team 🦄" <tickets@devcon.org>.
const MATOMO_PARAMS = 'mtm_campaign=early-bird-reminder&mtm_source=email&mtm_medium=email'

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const args = process.argv.slice(2).filter(a => a !== '--')
const inputPath = args.find(a => !a.startsWith('--')) ?? null
const doSend = process.argv.includes('--send')
const testTo = argValue('--test-to')
const skipSentPath = argValue('--skip-sent')

function redeemUrl(code: string): string {
  return pretixEventUrl(`/redeem?voucher=${encodeURIComponent(code)}&${MATOMO_PARAMS}`)
}

// Template notes (kept out of the HTML: comments in the body are shipped to
// recipients, and spam scanners flag a literal "<img>" token inside comments
// as an image without alt, costing spam-score points):
//   - Header is a full-width image (same artwork as devcon.org/en/form/*,
//     wordmark baked in). A plain image tag is never recolored by dark mode
//     (Gmail mobile included), unlike the old CSS-background + SVG-logo band.
//   - The meta color-scheme pair makes Apple Mail / Outlook iOS skip their
//     automatic dark-mode inversion. Gmail ignores it; that's why no text
//     sits on a dark background anywhere in this template.
function buildReminderHtml(voucherCode: string): string {
  const url = redeemUrl(voucherCode)
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Devcon India tickets are live</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 0;">
              <img src="https://devcon.org/email/email-header.png" alt="Devcon 8 India" width="560" style="display: block; width: 100%; max-width: 560px; height: auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #7235ed; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                Tickets are now on sale
              </p>
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #1a0d33; text-align: center;">
                Your Early Bird ticket is waiting
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                Devcon India ticket sales are <strong>officially open</strong>, and your reserved
                India Early Bird voucher is ready to use. Redeem it now to get your ticket for
                <strong>$${PRICE}</strong>.
              </p>
              <div style="background: #f2f1f4; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #594d73; text-transform: uppercase; letter-spacing: 1px;">
                  YOUR VOUCHER CODE
                </p>
                <p style="margin: 0; font-size: 28px; font-weight: 800; color: #7235ed; letter-spacing: 1px;">
                  ${voucherCode}
                </p>
              </div>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${url}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #fffffe; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  Get your ticket now
                </a>
              </div>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #594d73;">
                The button applies your code automatically. Your voucher is personal and linked to
                your verified identity, and it can only be used once.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #594d73; line-height: 1.5;">
                Follow <a href="https://x.com/EFDevcon" style="color: #7235ed; font-weight: 600; text-decoration: none;">@EFDevcon</a> on X for the latest Devcon 8 announcements, opportunities, and updates as we get closer to Mumbai.
              </p>
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                See you in Mumbai! 🇮🇳<br />
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

interface Recipient {
  code: string
  email: string
}

function parseCsv(file: string): Recipient[] {
  const out: Recipient[] = []
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.toLowerCase() === 'code,email') continue
    const comma = line.indexOf(',')
    if (comma === -1) continue
    const code = line.slice(0, comma).trim()
    const email = line.slice(comma + 1).trim().replace(/^"|"$/g, '')
    if (!code || !email.includes('@')) {
      console.warn(`  Skipping malformed row: ${line}`)
      continue
    }
    out.push({ code, email })
  }
  return out
}

/** code+email pairs already marked sent in a previous results CSV (for --skip-sent) */
function loadAlreadySent(file: string): Set<string> {
  const sent = new Set<string>()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const [code, email, status] = line.split(',')
    if (status?.trim() === 'sent') sent.add(`${code.trim()}:${email?.trim()}`)
  }
  return sent
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function main() {
  if (!inputPath) {
    console.error('Usage: pnpm run send-early-bird-reminder -- <input.csv> [--send] [--test-to a@b.c] [--skip-sent results.csv]')
    process.exit(1)
  }

  let recipients = parseCsv(inputPath)
  console.log(`Input: ${inputPath} (${recipients.length} recipients)`)
  console.log(`Sample redeem link: ${redeemUrl('EXAMPLECODE12345')}`)
  console.log('')

  if (skipSentPath) {
    const done = loadAlreadySent(skipSentPath)
    const before = recipients.length
    recipients = recipients.filter(r => !done.has(`${r.code}:${r.email}`))
    console.log(`--skip-sent: ${before - recipients.length} already sent, ${recipients.length} remaining`)
  }

  // Dedup on exact code+email pair only: the same code CAN go to several
  // recipients (and the same inbox can receive several codes); only a
  // duplicated row is dropped so nobody gets the identical email twice.
  const seen = new Set<string>()
  recipients = recipients.filter(r => {
    const key = `${r.code}:${r.email.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (!doSend && !testTo) {
    // ---- DRY RUN: previews only, no SMTP ----
    const previewDir = 'generated-codes/previews'
    fs.mkdirSync(previewDir, { recursive: true })
    for (const r of recipients) {
      fs.writeFileSync(path.join(previewDir, `${r.code}.html`), buildReminderHtml(r.code))
    }
    console.log('*** DRY RUN: no emails sent ***')
    console.log(`Subject: ${SUBJECT}`)
    console.log('')
    for (const r of recipients) console.log(`  ${r.code}  →  ${r.email}`)
    console.log('')
    console.log(`${recipients.length} HTML previews written to ${previewDir}/: open one in a browser to review.`)
    console.log('Re-run with --test-to you@example.com to send them to your own inbox,')
    console.log('or with --send to send for real.')
    return
  }

  if (testTo) {
    console.log(`*** TEST MODE: all ${recipients.length} emails go to ${testTo} ***`)
  } else {
    console.log(`*** LIVE SEND to ${recipients.length} recipients ***`)
  }
  console.log(`Subject: ${SUBJECT}`)
  console.log('')

  const transporter = getTransporter()
  const resultsPath = `generated-codes/reminder-results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
  fs.writeFileSync(resultsPath, 'code,email,status\n')

  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]
    const to = testTo ?? r.email
    try {
      await sendWithRetry(transporter, {
        from: DEFAULT_FROM,
        to,
        subject: SUBJECT,
        html: buildReminderHtml(r.code),
      })
      sent++
      fs.appendFileSync(resultsPath, `${r.code},${r.email},sent\n`)
      console.log(`  [${i + 1}/${recipients.length}] sent ${r.code} → ${to}`)
    } catch (err) {
      failed++
      fs.appendFileSync(resultsPath, `${r.code},${r.email},failed\n`)
      console.error(`  [${i + 1}/${recipients.length}] FAILED ${r.code} → ${to}: ${(err as Error).message}`)
    }
    if (i < recipients.length - 1) await sleep(300)
  }

  console.log('')
  console.log('=== Summary ===')
  console.log(`  Sent:   ${sent}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Results: ${resultsPath}`)
  if (failed > 0) {
    console.log(`  Resume failures with: --skip-sent ${resultsPath}`)
  }
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
