import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'
import { validateVoucher, applyVoucherDiscount, getTicketPurchaseInfo } from 'services/pretix'
import { setVoucherEmail } from 'services/discountStore'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { email, voucherCode } = req.body

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email address is required' })
  }

  if (!voucherCode || typeof voucherCode !== 'string' || !voucherCode.trim()) {
    return res.status(400).json({ success: false, error: 'Voucher code is required' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'Invalid email address format' })
  }

  try {
    // Validate the voucher is real via Pretix
    const voucher = await validateVoucher(voucherCode.trim())

    if (!voucher.valid) {
      return res.status(400).json({ success: false, error: voucher.error || 'Invalid voucher code' })
    }

    // Get ticket info for price display
    const ticketInfo = await getTicketPurchaseInfo()
    const admissionTickets = ticketInfo.tickets.filter(t => t.isAdmission && t.available)

    const applicableTickets = admissionTickets
      .filter(t => !voucher.itemId || t.id === voucher.itemId)
      .map(t => ({
        name: t.name,
        originalPrice: t.price,
        discountedPrice: applyVoucherDiscount(t.price, voucher),
      }))

    const firstTicket = applicableTickets[0]
    const formatPrice = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2))
    const discountedPrice = firstTicket ? formatPrice(parseFloat(firstTicket.discountedPrice)) : '—'
    const originalPrice = firstTicket ? formatPrice(parseFloat(firstTicket.originalPrice)) : '—'

    // Configure SMTP transport
    const smtpHost = process.env.SMTP_SERVICE || 'email-smtp.us-west-2.amazonaws.com'
    const smtpUser = process.env.SMTP_USERNAME
    const smtpPass = process.env.SMTP_PASSWORD
    const smtpFrom = process.env.SMTP_FROM || 'noreply@devcon.org'

    if (!smtpUser || !smtpPass) {
      console.error('SMTP credentials not configured')
      return res.status(500).json({ success: false, error: 'Email service is not configured' })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const htmlBody = `
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
            <td style="background: #1a0d33; padding: 32px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Devcon India
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #c4b5d9;">
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
                  ${voucherCode.trim()}
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

    await transporter.sendMail({
      from: `"Devcon India" <${smtpFrom}>`,
      to: email.trim(),
      subject: 'Your Devcon India Voucher Code',
      html: htmlBody,
    })

    // Store the email address on the voucher row
    try {
      await setVoucherEmail(voucherCode.trim(), email.trim())
    } catch (e) {
      console.error('Failed to store voucher email (non-fatal):', e)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error sending voucher email:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send email. Please try again later.',
    })
  }
}
