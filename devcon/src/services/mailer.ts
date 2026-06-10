/**
 * Shared SMTP mailer (AWS SES) used by all transactional emails.
 * Provides the transporter + retry logic and a generic `sendMail` helper.
 */

import nodemailer from 'nodemailer'

export function getTransporter() {
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

export async function sendWithRetry(
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

/** Send a transactional email via the configured SMTP, with retry.
 *  Returns { success: true } or { success: false, error }. */
export async function sendMail({
  to,
  subject,
  html,
  fromName = 'Devcon',
}: {
  to: string
  subject: string
  html: string
  fromName?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter()
    const smtpFrom = process.env.SMTP_FROM || 'noreply@devcon.org'
    await sendWithRetry(transporter, { from: `"${fromName}" <${smtpFrom}>`, to, subject, html })
    return { success: true }
  } catch (error) {
    console.error('[mailer] send failed:', error)
    return { success: false, error: 'Failed to send email' }
  }
}
