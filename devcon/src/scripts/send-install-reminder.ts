/**
 * Send the pre-conference "install the app" reminder to Devcon 8 India ticket
 * holders who have never signed into the event app.
 *
 * Input: an `email,name` CSV (produced by pretix:export-attendee-emails).
 * For each row not already a Supabase auth user (i.e. never signed in),
 * signs a bridge token (see event-app's src/data/auth/bridgeToken.ts — same
 * INSTALL_BRIDGE_SECRET, required in this env too) and would email a link to
 * the event app's /api/auth/bridge using the same SES SMTP infra + visual
 * template as the other campaign emails in services/emailLayout.ts. That
 * route verifies the token, generates a real Supabase magic link at the
 * moment it's actually clicked (not now, so it can never go stale sitting in
 * an inbox), and signs the recipient in via a server-side cookie before
 * landing them on /ticket.
 *
 * SAFE BY DEFAULT: without --send or --test-to this is a dry run — no
 * bridge tokens are signed and no SMTP connection is made. It prints the
 * would-be recipient list and writes rendered .html previews (with a
 * placeholder link) to generated-codes/previews/ for review.
 *
 * EXTRA SAFETY: even with --send, the actual SMTP dispatch call is commented
 * out below (see "ACTUAL SEND — commented out" in the main loop). This was
 * requested explicitly so the script can be built, reviewed, and test-run
 * end-to-end (real bridge links, rendered emails, console/results output)
 * without any risk of a real send slipping out. Enabling a real send
 * requires deliberately uncommenting that block.
 *
 * Usage:
 *   pnpm run send-install-reminder -- generated-codes/attendee-emails-2026-08-04.csv                    # dry run + previews
 *   pnpm run send-install-reminder -- generated-codes/attendee-emails-2026-08-04.csv --test-to me@x.com  # real link, all "sent" to one inbox (still just logged — see EXTRA SAFETY above)
 *   pnpm run send-install-reminder -- generated-codes/attendee-emails-2026-08-04.csv --send
 *   add --skip-sent generated-codes/install-reminder-results-2026-08-04T12-00-00-000Z.csv to resume a partial run
 *
 * Results are written to generated-codes/install-reminder-results-<timestamp>.csv
 * (email,status) so a partial run can be resumed with --skip-sent. Until the
 * ACTUAL SEND block is uncommented, no row will ever be marked "sent" —
 * --skip-sent stays correctly inert until real sending is enabled.
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createHmac } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getTransporter, sendWithRetry, DEFAULT_FROM } from '../services/mailer'
import { EMAIL_HEADER_ROW, EMAIL_COLOR_SCHEME_META, emailEyebrow } from '../services/emailLayout'

// Same signing scheme as event-app's src/data/auth/bridgeToken.ts — must use
// the same INSTALL_BRIDGE_SECRET so that app can verify what we sign here.
function signBridgeToken(email: string): string {
  const secret = process.env.INSTALL_BRIDGE_SECRET
  if (!secret) throw new Error('INSTALL_BRIDGE_SECRET is required (same value as event-app)')
  const body = Buffer.from(JSON.stringify({ email, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

// ---- Campaign copy ----
const SUBJECT = '📲 Your Devcon 8 India ticket is ready — install the app'
const EVENT_APP_ORIGIN = process.env.EVENT_APP_ORIGIN || 'https://devcon-event-app.netlify.app'

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const args = process.argv.slice(2).filter(a => a !== '--')
const inputPath = args.find(a => !a.startsWith('--')) ?? null
const doSend = process.argv.includes('--send')
const testTo = argValue('--test-to')
const skipSentPath = argValue('--skip-sent')

function buildReminderHtml(name: string, magicLink: string): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  // Getting into Safari on iOS is now handled in-app (the install-bridge
  // feature on /ticket itself), which is far more reliable than anything a
  // static email link can do — no Safari-specific link needed here anymore.
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${EMAIL_COLOR_SCHEME_META}
  <title>Your Devcon 8 India ticket is ready</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
${EMAIL_HEADER_ROW}
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
${emailEyebrow('Your ticket is ready')}
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #1a0d33; text-align: center;">
                Get the app before you arrive
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                ${greeting} your Devcon 8 India ticket is ready. Install the event app now
                so it's one tap away when you land — your ticket QR code, the schedule, and
                the venue map all work offline.
              </p>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${magicLink}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #fffffe; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  View my ticket &amp; install
                </a>
              </div>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #594d73;">
                This link signs you in automatically — no password needed.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                You're receiving this because you have a ticket for Devcon 8 India.<br />
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

interface Recipient {
  email: string
  name: string
}

function parseCsv(file: string): Recipient[] {
  const out: Recipient[] = []
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.toLowerCase() === 'email,name') continue
    const comma = line.indexOf(',')
    const email = (comma === -1 ? line : line.slice(0, comma)).trim().toLowerCase()
    const name = comma === -1 ? '' : line.slice(comma + 1).trim().replace(/^"|"$/g, '')
    if (!email.includes('@')) {
      console.warn(`  Skipping malformed row: ${line}`)
      continue
    }
    out.push({ email, name })
  }
  return out
}

/** emails already marked sent in a previous results CSV (for --skip-sent) */
function loadAlreadySent(file: string): Set<string> {
  const sent = new Set<string>()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const [email, status] = line.split(',')
    if (status?.trim() === 'sent') sent.add(email?.trim().toLowerCase())
  }
  return sent
}

/** Every email that already has a Supabase auth user (paginated) — these
 *  people have signed into the app before and don't need the nudge. */
async function fetchExistingUserEmails(supabaseAdmin: SupabaseClient): Promise<Set<string>> {
  const emails = new Set<string>()
  const perPage = 1000
  for (let page = 1; page <= 500; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Supabase listUsers error: ${error.message}`)
    for (const u of data.users) {
      if (u.email) emails.add(u.email.toLowerCase())
    }
    if (data.users.length < perPage) break
  }
  return emails
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function main() {
  if (!inputPath) {
    console.error('Usage: pnpm run send-install-reminder -- <input.csv> [--send] [--test-to a@b.c] [--skip-sent results.csv]')
    process.exit(1)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (same Supabase project the event app uses)')
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  let recipients = parseCsv(inputPath)
  console.log(`Input: ${inputPath} (${recipients.length} attendee emails)`)

  if (skipSentPath) {
    const done = loadAlreadySent(skipSentPath)
    const before = recipients.length
    recipients = recipients.filter(r => !done.has(r.email))
    console.log(`--skip-sent: ${before - recipients.length} already sent, ${recipients.length} remaining`)
  }

  console.log('Checking which recipients already have an account (skip — they\'ve used the app before)...')
  const existing = await fetchExistingUserEmails(supabaseAdmin)
  const beforeExclusion = recipients.length
  recipients = recipients.filter(r => !existing.has(r.email))
  console.log(`  ${beforeExclusion - recipients.length} already onboarded, ${recipients.length} to remind`)
  console.log('')

  if (!doSend && !testTo) {
    // ---- DRY RUN: previews only, no Supabase admin calls, no SMTP ----
    const previewDir = 'generated-codes/previews'
    fs.mkdirSync(previewDir, { recursive: true })
    const placeholderLink = `${EVENT_APP_ORIGIN}/ticket?token=PREVIEW`
    for (const r of recipients.slice(0, 20)) {
      const safeName = r.email.replace(/[^a-z0-9.@-]/gi, '_')
      fs.writeFileSync(path.join(previewDir, `${safeName}.html`), buildReminderHtml(r.name, placeholderLink))
    }
    console.log('*** DRY RUN: no magic links generated, no emails sent ***')
    console.log(`Subject: ${SUBJECT}`)
    console.log('')
    for (const r of recipients) console.log(`  ${r.email}${r.name ? ` (${r.name})` : ''}`)
    console.log('')
    console.log(`Up to 20 HTML previews written to ${previewDir}/ (placeholder link): open one in a browser to review.`)
    console.log('Re-run with --test-to you@example.com to generate a real link and preview the real flow,')
    console.log('or with --send once ready for the full list. Either way, see the EXTRA SAFETY note at the')
    console.log('top of this file — the actual SMTP dispatch stays commented out until deliberately enabled.')
    return
  }

  if (testTo) {
    console.log(`*** TEST MODE: real bridge links signed, all logged as going to ${testTo} ***`)
  } else {
    console.log(`*** LIVE SEND to ${recipients.length} recipients ***`)
  }
  console.log(`Subject: ${SUBJECT}`)
  console.log('')

  // Only constructed for parity with send-early-bird-reminder.ts and to be
  // ready the moment the ACTUAL SEND block below is uncommented.
  const transporter = getTransporter()
  const resultsPath = `generated-codes/install-reminder-results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
  fs.writeFileSync(resultsPath, 'email,status\n')

  let previewed = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]
    const to = testTo ?? r.email
    try {
      const bridgeToken = signBridgeToken(r.email)
      const magicLink = `${EVENT_APP_ORIGIN}/api/auth/bridge?bridge=${encodeURIComponent(bridgeToken)}`
      const html = buildReminderHtml(r.name, magicLink)

      // ----------------------------------------------------------------
      // ACTUAL SEND — commented out on purpose. See the file header for
      // why. Uncomment these lines (and remove the console.log + status
      // below) once ready to really deliver this campaign.
      // ----------------------------------------------------------------
      // await sendWithRetry(transporter, {
      //   from: DEFAULT_FROM,
      //   to,
      //   subject: SUBJECT,
      //   html,
      // })
      // fs.appendFileSync(resultsPath, `${r.email},sent\n`)
      // console.log(`  [${i + 1}/${recipients.length}] sent → ${to}`)

      console.log(`  [${i + 1}/${recipients.length}] [would send] ${to} -> ${magicLink}`)
      fs.appendFileSync(resultsPath, `${r.email},would-send\n`)
      previewed++
    } catch (err) {
      failed++
      fs.appendFileSync(resultsPath, `${r.email},failed\n`)
      console.error(`  [${i + 1}/${recipients.length}] FAILED ${to}: ${(err as Error).message}`)
    }
    if (i < recipients.length - 1) await sleep(300)
  }

  console.log('')
  console.log('=== Summary ===')
  console.log(`  Would send: ${previewed}`)
  console.log(`  Failed:     ${failed}`)
  console.log(`  Results:    ${resultsPath}`)
  console.log('')
  console.log('No emails were actually sent — the ACTUAL SEND block is commented out. See file header.')
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
