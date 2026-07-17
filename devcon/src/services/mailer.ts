/**
 * Shared SMTP mailer (AWS SES) used by all transactional emails.
 * Provides the transporter + retry logic and a generic `sendMail` helper.
 */

import nodemailer from 'nodemailer'

/** Canonical sender for ALL transactional email, matching the Pretix shop's
 *  sender so everything a buyer receives comes from one recognizable identity.
 *  SMTP_FROM overrides the address (not the display name) if ever needed.
 *  The address must be SES-verified (the devcon.org domain identity). */
export const FROM_ADDRESS = process.env.SMTP_FROM || 'tickets@devcon.org'
export const DEFAULT_FROM_NAME = 'Devcon Team 🦄'
export const DEFAULT_FROM = `"${DEFAULT_FROM_NAME}" <${FROM_ADDRESS}>`

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
  fromName = DEFAULT_FROM_NAME,
}: {
  to: string
  subject: string
  html: string
  fromName?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter()
    await sendWithRetry(transporter, { from: `"${fromName}" <${FROM_ADDRESS}>`, to, subject, html })
    return { success: true }
  } catch (error) {
    console.error('[mailer] send failed:', error)
    return { success: false, error: 'Failed to send email' }
  }
}
