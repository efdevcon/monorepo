/**
 * Voucher Email Service
 * Sends voucher confirmation emails via AWS SES SMTP.
 * Used by both the redeem-self backend (automatic) and send-voucher-email API (manual re-send).
 */

import nodemailer from 'nodemailer'
import { validateVoucher, getTicketPurchaseInfo } from 'services/pretix'
import { setVoucherEmail } from 'services/discountStore'

// Dedup: prevent the same voucher+email combo from being sent twice
// (Self SDK posts the proof twice, both requests trigger trySendEmail)
const recentlySent = new Set<string>()

function getTransporter() {
  const smtpHost = process.env.SMTP_SERVICE || 'email-smtp.us-west-2.amazonaws.com'
  const smtpUser = process.env.SMTP_USERNAME
  const smtpPass = process.env.SMTP_PASSWORD

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials not configured')
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

function buildEmailHtml(voucherCode: string, discountedPrice: string, originalPrice: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Devcon India Voucher Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #1a0d33 url('https://devcon.org/email/header-bg.png') center/cover no-repeat; padding: 32px 32px 24px; text-align: center;">
              <img src="https://devcon.org/email/devcon-logo-white.svg" alt="Devcon 8 India" width="149" height="64" style="display: inline-block; max-width: 149px;" />
              <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff;">
                Your voucher code is reserved
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #1a0d33;">
                Your Voucher Code
              </h2>
              <div style="background: #f2f1f4; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #594d73; text-transform: uppercase; letter-spacing: 1px;">
                  DISCOUNT CODE
                </p>
                <p style="margin: 0; font-size: 28px; font-weight: 800; color: #7235ed; letter-spacing: 1px;">
                  ${voucherCode}
                </p>
              </div>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                This code is reserved and linked to your Aadhaar ID. When tickets go on sale, you'll pay
                <strong>$${discountedPrice}</strong> instead of $${originalPrice}.
              </p>
              <hr style="border: none; border-top: 1px solid #dddae2; margin: 24px 0;" />
              <h3 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #1a0d33;">
                What happens next?
              </h3>
              <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 15px; line-height: 1.6; color: #1a0d33;">
                <li style="margin-bottom: 8px;">We'll notify you before tickets go live so you're ready to secure yours early.</li>
                <li style="margin-bottom: 8px;">When tickets go live, we'll send you a reminder with a <strong>direct link</strong> to purchase your ticket.</li>
                <li>Your exclusive <strong>$${discountedPrice}</strong> price will be applied automatically.</li>
              </ul>
              <div style="text-align: center;">
                <a href="https://devcon.org" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #ffffff; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  Visit devcon.org
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                Thank you, we'll be in touch!<br />
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

async function sendWithRetry(
  transporter: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
  retries = 2
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail(mailOptions)
      return
    } catch (err: unknown) {
      const isRetryable =
        err instanceof Error &&
        ('code' in err && (err as { code?: string }).code === 'ETIMEDOUT' ||
         'code' in err && (err as { code?: string }).code === 'ESOCKET' ||
         'code' in err && (err as { code?: string }).code === 'ECONNRESET')
      if (!isRetryable || attempt === retries) throw err
      // Brief pause before retry, create a fresh transport for the new attempt
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      transporter = getTransporter()
    }
  }
}

/**
 * Send a voucher confirmation email.
 *
 * When skipValidation is true (backend calls where voucher was just assigned),
 * skips the Pretix API call — avoids an extra network round-trip in serverless.
 *
 * Returns { success: true } on success, or { success: false, error: string } on failure.
 */
export async function sendVoucherEmail(
  email: string,
  voucherCode: string,
  { skipValidation = false }: { skipValidation?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  const trimmedEmail = email.trim()
  const trimmedCode = voucherCode.trim()

  // Dedup: skip if this exact combo was sent in the last 5 minutes
  const dedupKey = `${trimmedEmail}:${trimmedCode}`
  if (recentlySent.has(dedupKey)) {
    return { success: true } // already sent
  }
  recentlySent.add(dedupKey)
  setTimeout(() => recentlySent.delete(dedupKey), 5 * 60 * 1000)

  try {
    let discountedPrice = '—'
    let originalPrice = '—'

    if (!skipValidation) {
      // Validate the voucher is real via Pretix (used by manual re-send API)
      const voucher = await validateVoucher(trimmedCode)
      if (!voucher.valid) {
        return { success: false, error: voucher.error || 'Invalid voucher code' }
      }

      const ticketInfo = await getTicketPurchaseInfo()
      const admissionTickets = ticketInfo.tickets.filter(t => t.isAdmission && t.available)
      const applicableTickets = admissionTickets
        .filter(t => !voucher.itemId || t.id === voucher.itemId)
        .map(t => ({
          originalPrice: t.originalPrice || t.price,
          discountedPrice: t.price,
        }))

      const firstTicket = applicableTickets[0]
      const formatPrice = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2))
      discountedPrice = firstTicket ? formatPrice(parseFloat(firstTicket.discountedPrice)) : '—'
      originalPrice = firstTicket ? formatPrice(parseFloat(firstTicket.originalPrice)) : '—'
    } else {
      // Fast path: fetch ticket prices only (skip voucher validation)
      try {
        const ticketInfo = await getTicketPurchaseInfo()
        const admissionTickets = ticketInfo.tickets.filter(t => t.isAdmission && t.available)
        const firstTicket = admissionTickets[0]
        const formatPrice = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2))
        discountedPrice = firstTicket ? formatPrice(parseFloat(firstTicket.price)) : '—'
        originalPrice = firstTicket ? formatPrice(parseFloat(firstTicket.originalPrice || firstTicket.price)) : '—'
      } catch {
        console.warn('[voucherEmail] Could not fetch ticket prices, using fallback')
        // Hardcoded fallback so the email still sends even if Pretix is unreachable
        discountedPrice = '99'
        originalPrice = '149'
      }
    }

    const transporter = getTransporter()
    const smtpFrom = process.env.SMTP_FROM || 'noreply@devcon.org'

    await sendWithRetry(transporter, {
      from: `"Devcon India" <${smtpFrom}>`,
      to: trimmedEmail,
      subject: 'Your Devcon India Voucher Code',
      html: buildEmailHtml(trimmedCode, discountedPrice, originalPrice),
    })

    // Store the email address on the voucher row
    try {
      await setVoucherEmail(trimmedCode, trimmedEmail)
    } catch (e) {
      console.error('Failed to store voucher email (non-fatal):', e)
    }

    return { success: true }
  } catch (error) {
    console.error('[voucherEmail] Error sending voucher email:', error)
    // Clear dedup so a retry (manual or automatic) can try again
    recentlySent.delete(dedupKey)
    return { success: false, error: 'Failed to send email' }
  }
}
