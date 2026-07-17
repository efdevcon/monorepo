/**
 * Voucher Email Service
 * Sends voucher confirmation emails via AWS SES SMTP.
 * Used by both the redeem-self backend (automatic) and send-voucher-email API (manual re-send).
 */

import { validateVoucher, getTicketPurchaseInfo } from 'services/pretix'
import { setVoucherEmail, setVoucherEmailSent } from 'services/discountStore'
import { getTransporter, sendWithRetry } from 'services/mailer'
import { pretixEventUrl } from 'config/ticketing'

// Dedup: prevent the same voucher+email combo from being sent twice
// (Self SDK posts the proof twice, both requests trigger trySendEmail)
const recentlySent = new Set<string>()

function buildEmailHtml(voucherCode: string, discountedPrice: string, originalPrice: string): string {
  // Deep-link straight to the Pretix store with the voucher pre-applied.
  const redeemUrl = pretixEventUrl(`/redeem?voucher=${encodeURIComponent(voucherCode)}`)
  // Only show the price line when we actually resolved real numbers (not the
  // '—' / 'XX' placeholders used when Pretix is unreachable).
  const hasPrices = /^\d/.test(discountedPrice) && /^\d/.test(originalPrice)
  const priceLine = hasPrices
    ? `With this voucher you'll pay <strong>$${discountedPrice}</strong> instead of $${originalPrice}.`
    : `This voucher applies your discount automatically at checkout.`
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Light-only rendering: Apple Mail / Outlook iOS respect this and skip
       dark-mode inversion. Gmail ignores it; the header text uses #fffffe
       so Gmail's pure-white remap passes it through. -->
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Your Devcon India Voucher Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
          <!-- Header -->
          <tr>
            <!-- Full-width image header: the same artwork as the devcon.org/en/form/*
                 pages (wordmark baked into the image). A plain <img> is never
                 recolored by dark mode (Gmail mobile included) and renders in every
                 client, unlike the old CSS-background + SVG-logo band. -->
            <td style="padding: 0;">
              <img src="https://devcon.org/email/email-header.png" alt="Devcon 8 India" width="560" style="display: block; width: 100%; max-width: 560px; height: auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #7235ed; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                Your voucher code is reserved
              </p>
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
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                ${priceLine} Click below to redeem it now and secure your ticket.
              </p>
              <div style="text-align: center;">
                <a href="${redeemUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #fffffe; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  Redeem your voucher
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
        // Fallback placeholders so the email still sends even if Pretix is unreachable
        discountedPrice = 'XX'
        originalPrice = 'YY'
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

    // Mark email as sent + store email (for manual re-send path where redeem-self didn't set it)
    try {
      await setVoucherEmail(trimmedCode, trimmedEmail)
      await setVoucherEmailSent(trimmedCode)
    } catch (e) {
      console.error('Failed to update voucher email status (non-fatal):', e)
    }

    return { success: true }
  } catch (error) {
    console.error('[voucherEmail] Error sending voucher email:', error)
    // Clear dedup so a retry (manual or automatic) can try again
    recentlySent.delete(dedupKey)
    return { success: false, error: 'Failed to send email' }
  }
}
