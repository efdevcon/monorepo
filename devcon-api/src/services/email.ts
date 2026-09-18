import nodemailer from 'nodemailer'
import { SERVER_CONFIG } from '@/utils/config'
import emailTemplates from './email-templates.json'

type EmailTemplates = 'default-email' | 'email-cta' | 'accreditation-confirmation'

const transporter = nodemailer.createTransport({
  host: SERVER_CONFIG.SMTP_SERVICE,
  port: 465,
  secure: true,
  auth: {
    user: SERVER_CONFIG.SMTP_USERNAME,
    pass: SERVER_CONFIG.SMTP_PASSWORD,
  },
})

export async function sendMail(to: string, template: EmailTemplates, subject: string, properties: { [key: string]: string }) {
  const from = `"${SERVER_CONFIG.SMTP_DEFAULT_FROM_NAME}" <${SERVER_CONFIG.SMTP_DEFAULT_FROM}>`
  let text = replace(emailTemplates.defaultEmail.text.join('\n'), properties)
  let html = replace(emailTemplates.defaultEmail.html, properties).replace(/(?:\r\n|\r|\n)/g, '<br>')

  if (template === 'email-cta') {
    text = replace(emailTemplates.ctaEmail.text.join('\n'), properties)
    html = replace(emailTemplates.ctaEmail.html, properties).replace(/(?:\r\n|\r|\n)/g, '<br>')
  } else if (template === 'accreditation-confirmation') {
    text = replace(emailTemplates.accreditationConfirmation.text.join('\n'), properties)
    html = replace(emailTemplates.accreditationConfirmation.html, properties).replace(/(?:\r\n|\r|\n)/g, '<br>')
  }

  const response = await transporter.sendMail({
    from: from,
    to: to,
    subject: subject,
    text: text,
    html: html,
  })

  return response.accepted.length > 0
}

// Example usage for accreditation confirmation
export async function sendAccreditationConfirmationEmail(to: string, name: string, accreditationLink: string) {
  const properties = {
    Name: name,
    AccreditationLink: accreditationLink,
    AccreditationGuideUrl: SERVER_CONFIG.ACCREDITATION_GUIDE_URL,
  }

  return sendMail(to, 'accreditation-confirmation', '🎉 Your Accreditation Has Been Confirmed!', properties)
}

/**
 * Devcon transactional-email chrome, mirrored from devcon/src/services/
 * emailLayout.ts (same header image, colours and footer, so this email looks
 * like the voucher and builder emails buyers already know). Keep the two in
 * step when the header changes.
 */
const DEVCON_EMAIL_HEADER = `          <tr>
            <td style="padding: 0;">
              <img src="https://devcon.org/email/email-header.png" alt="Devcon 8 India" width="560" style="display: block; width: 100%; max-width: 560px; height: auto;" />
            </td>
          </tr>`

function devconEmailHtml(opts: { title: string; eyebrow: string; heading: string; paragraphs: string[]; cta?: { label: string; url: string } }) {
  const body = opts.paragraphs
    .map((p) => `              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">${p}</p>`)
    .join('\n')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${opts.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f7; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(22, 11, 43, 0.08);">
${DEVCON_EMAIL_HEADER}
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #7235ed; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                ${opts.eyebrow}
              </p>
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #1a0d33;">
                ${opts.heading}
              </h2>
${body}
${
  opts.cta
    ? `              <div style="text-align: center; margin-top: 24px;">
                <a href="${opts.cta.url}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #fffffe; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  ${opts.cta.label}
                </a>
              </div>`
    : ''
}
            </td>
          </tr>
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
 * Sent when a speaker's CFP email has no Google account: Drive can only
 * reach such an address with an invitation email, and those were not
 * delivered in testing (2026-09-18), so the speaker would never learn their
 * deck exists. One ask: reply with a Google account address. Sent FROM the
 * speaker-support mailbox (SLIDES_CONTACT_EMAIL, speak@devcon.org) so a
 * plain reply lands with the people who can act on it.
 */
export async function sendSlidesNoGoogleAccountEmail(
  to: string,
  props: { speakerName: string; talkTitle: string; talkCode: string; contactEmail: string; eventName: string }
) {
  // Talk code in the subject: a plain reply then still says which session it is about.
  const subject = `Your ${props.eventName} slides: we need a Google account [${props.talkCode}]`
  const paragraphs = [
    `Hi ${props.speakerName},`,
    `Your slides deck for <strong>${props.talkTitle}</strong> is ready. Google can only share it with a Google account, and ${to} is not one.`,
    `Reply to this email with a Google account address (Gmail or Google Workspace) and we will share the deck with it.`,
    `Or create a Google account for ${to} at <a href="https://accounts.google.com/signup" style="color: #7235ed;">accounts.google.com</a> and reply once it exists, so we can make sure the deck is shared with it.`,
  ]
  const text = [
    `Hi ${props.speakerName},`,
    '',
    `Your slides deck for "${props.talkTitle}" is ready. Google can only share it with a Google account, and ${to} is not one.`,
    '',
    `Reply to this email with a Google account address (Gmail or Google Workspace) and we will share the deck with it.`,
    '',
    `Or create a Google account for ${to} at https://accounts.google.com/signup and reply once it exists, so we can make sure the deck is shared with it.`,
    '',
    'Thank you, The Devcon Team',
  ].join('\n')
  const html = devconEmailHtml({
    title: subject,
    eyebrow: `Your ${props.eventName} slides`,
    heading: 'We need a Google account to share your slides',
    paragraphs,
  })
  const response = await transporter.sendMail({
    from: `"Devcon Team 🦄" <${props.contactEmail}>`,
    replyTo: props.contactEmail,
    to,
    subject,
    text,
    html,
  })
  return response.accepted.length > 0
}

function replace(template: string, data: any) {
  const pattern = /{%\s*(\w+?)\s*%}/g // {%property%}
  return template.replace(pattern, (_, token) => data[token] || '')
}
