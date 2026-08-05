/**
 * Ad-hoc test send for the "install the app" reminder — a real send to one
 * inbox, with a fresh bridge link, for manually testing the flow (email →
 * bridge link → /api/auth/bridge verifies server-side → signed in on
 * /ticket via cookie → install). Not part of the real campaign pipeline
 * (see send-install-reminder.ts for that) — kept around since we reuse this
 * often while iterating on the install-bridge feature. Safe to re-run any
 * time; each run signs a brand new bridge token.
 *
 * Usage: npx tsx src/scripts/send-test-install-email.ts
 * Requires TEST_EMAIL set in .env (not committed — keeps personal emails out
 * of source).
 */
import 'dotenv/config'
import { createHmac } from 'crypto'
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

const EVENT_APP_ORIGIN = 'https://devcon-event-app.netlify.app'
const TEST_EMAIL = process.env.TEST_EMAIL
const SUBJECT = '📲 Your Devcon 8 India ticket is ready — install the app'

function buildReminderHtml(name: string, magicLink: string): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
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
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                [TEST EMAIL — not a real campaign send]<br />
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

async function main() {
  if (!TEST_EMAIL) throw new Error('TEST_EMAIL is required — set it in .env')
  const bridgeToken = signBridgeToken(TEST_EMAIL)
  const magicLink = `${EVENT_APP_ORIGIN}/api/auth/bridge?bridge=${encodeURIComponent(bridgeToken)}`
  console.log('Bridge link:', magicLink)

  const transporter = getTransporter()
  await sendWithRetry(transporter, {
    from: DEFAULT_FROM,
    to: TEST_EMAIL,
    subject: `[TEST] ${SUBJECT}`,
    html: buildReminderHtml('Didier', magicLink),
  })
  console.log(`Sent to ${TEST_EMAIL}`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
