/**
 * Builder application emails (rejection notice).
 * Approvals are handled by the voucher email (services/voucherEmail.ts).
 */

import { sendMail } from 'services/mailer'

// Escape applicant-supplied text before interpolating it into the email HTML.
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

function buildRejectionHtml(name: string): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Devcon Builder Application</title>
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
                Sanctuary Tech Builders application update
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                ${greeting}
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                Thank you for applying for a Sanctuary Tech Builders discount. We received an incredible number
                of applications this year, and after careful review we're unable to offer you a discount this
                time.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                We'd still love to see you at Devcon. You can explore ticket options and any other discounts
                you may qualify for at the ticket store below.
              </p>
              <div style="text-align: center;">
                <a href="https://devcon.org/en/tickets/store/" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #ffffff; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  Visit the ticket store
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                Thank you for being part of the community.<br />
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

/** Email an applicant that their builder application was not approved. */
export async function sendBuilderRejectionEmail(
  email: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  return sendMail({
    to: email.trim(),
    subject: 'Your Sanctuary Tech Builders application',
    html: buildRejectionHtml((name || '').trim()),
    fromName: 'Devcon',
  })
}
