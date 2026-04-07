/**
 * Webhook: POST /api/webhook/confirm-student-application
 * Called by NocoDB when a student application's Status field changes.
 * Sends a confirmation or rejection email based on the new status.
 * Protected by x-webhook-key header.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'

const WEBHOOK_SECRET = process.env.NOCODB_WEBHOOK_SECRET

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

function buildConfirmationEmail(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Application — Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #1a0d33; padding: 32px 32px 24px; text-align: center;">
              <img src="https://devcon.org/email/devcon-logo-white.svg" alt="Devcon 8" width="149" height="64" style="display: inline-block; max-width: 149px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #1a0d33;">
                Congratulations, ${name}!
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1a0d33;">
                Your student application for Devcon 8 has been <strong style="color: #16a34a;">approved</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1a0d33;">
                We're excited to have you join us! You'll receive more details about next steps, including how to claim your student ticket, in a follow-up email.
              </p>
              <h3 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #1a0d33;">
                What happens next?
              </h3>
              <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 15px; line-height: 1.6; color: #1a0d33;">
                <li style="margin-bottom: 8px;">Keep an eye on your inbox for ticket purchase instructions.</li>
                <li style="margin-bottom: 8px;">Join the Devcon community channels for updates.</li>
                <li>Start planning your Devcon experience!</li>
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
                See you at Devcon!<br />
                The Devcon Team
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

function buildRejectionEmail(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Application — Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #1a0d33; padding: 32px 32px 24px; text-align: center;">
              <img src="https://devcon.org/email/devcon-logo-white.svg" alt="Devcon 8" width="149" height="64" style="display: inline-block; max-width: 149px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #1a0d33;">
                Hi ${name},
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1a0d33;">
                Thank you for applying to the Devcon 8 student program. After reviewing your application, we're unable to offer you a student ticket at this time.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1a0d33;">
                We received a high volume of applications and had to make difficult decisions. This does not reflect on your potential — we encourage you to apply again for future events.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1a0d33;">
                You can still attend Devcon by purchasing a regular ticket when they become available.
              </p>
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
                Thank you for your interest in Devcon.<br />
                The Devcon Team
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  // Verify webhook secret
  if (!WEBHOOK_SECRET) {
    console.error('[webhook/confirm-student-application] NOCODB_WEBHOOK_SECRET not configured')
    return res.status(500).json({ success: false, error: 'Webhook not configured' })
  }

  const providedKey =
    (req.headers['x-webhook-key'] as string) ||
    (req.headers['x-admin-key'] as string) ||
    (req.query['x-admin-key'] as string)
  if (providedKey !== WEBHOOK_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  try {
    const { data } = req.body ?? {}
    if (!data?.rows?.length || !data?.previous_rows?.length) {
      return res.status(400).json({ success: false, error: 'Invalid webhook payload' })
    }

    const row = data.rows[0]
    const previousRow = data.previous_rows[0]

    // Only act when Status actually changed
    const newStatus = row['Status']
    const oldStatus = previousRow['Status']
    if (newStatus === oldStatus) {
      return res.status(200).json({ success: true, skipped: true, reason: 'Status unchanged' })
    }

    const email = row['Email']
    const name = row['Full Name'] || 'Applicant'

    if (!email) {
      return res.status(400).json({ success: false, error: 'No email in row data' })
    }

    let subject: string
    let html: string

    if (newStatus === 'Validated') {
      subject = 'Your Devcon 8 Student Application Has Been Approved!'
      html = buildConfirmationEmail(name)
    } else if (newStatus === 'Rejected') {
      subject = 'Devcon 8 Student Application — Update'
      html = buildRejectionEmail(name)
    } else {
      return res.status(200).json({ success: true, skipped: true, reason: `Status "${newStatus}" does not trigger email` })
    }

    const transporter = getTransporter()
    const smtpFrom = process.env.SMTP_FROM || 'noreply@devcon.org'

    await transporter.sendMail({
      from: `"Devcon" <${smtpFrom}>`,
      to: email,
      subject,
      html,
    })

    console.log(`[webhook/confirm-student-application] Sent ${newStatus} email to ${email}`)
    return res.status(200).json({ success: true, status: newStatus, email })
  } catch (err) {
    console.error('[webhook/confirm-student-application]', err)
    return res.status(500).json({ success: false, error: 'Failed to process webhook' })
  }
}
