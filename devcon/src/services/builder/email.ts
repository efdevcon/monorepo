/**
 * Builder application emails (approval + rejection notices).
 */

import { sendMail } from 'services/mailer'
import { pretixEventUrl } from 'config/ticketing'

// Escape applicant-supplied text before interpolating it into the email HTML.
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

function buildApprovalHtml(name: string, voucherCode: string): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  // Deep-link straight to the Pretix store with the voucher pre-applied.
  const redeemUrl = pretixEventUrl(`/redeem?voucher=${encodeURIComponent(voucherCode)}`)
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Sanctuary Tech Builder application has been approved</title>
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
                We're pleased to let you know that <strong>we approved your application for a Sanctuary Tech
                Builder Discount to Devcon 8</strong>!
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                You can use the button below to redeem your discount:
              </p>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${redeemUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 700; color: #ffffff; background-color: #7235ed; border-radius: 9999px; text-decoration: none;">
                  Redeem your discount
                </a>
              </div>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                <strong>Please redeem this voucher within 1 month of receiving this email!</strong>
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                If you miss the redemption window for the voucher, contact us at
                <a href="mailto:support@devcon.org" style="color: #7235ed;">support@devcon.org</a> &amp; we'll
                revalidate it if there is still availability.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                <strong>Note</strong>: If you already ordered a ticket &amp; would like to use this discounted
                one instead, you'll need to go back to your original order confirmation page &amp; click
                <strong>Cancel Order</strong> at the bottom.
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #1a0d33;">
                We look forward to seeing you in Mumbai!
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f9f8fa; border-top: 1px solid #dddae2; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #594d73; line-height: 1.5;">
                Best,<br />
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
            <td style="padding: 0;">
              <img src="https://devcon.org/email/email-header.png" alt="Devcon 8 India" width="560" style="display: block; width: 100%; max-width: 560px; height: auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #7235ed; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                Sanctuary Tech Builders application update
              </p>
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

/** Email an applicant that their builder application was approved, with their voucher code. */
export async function sendBuilderApprovalEmail(
  email: string,
  voucherCode: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  return sendMail({
    to: email.trim(),
    subject: 'Your Sanctuary Tech Builder application has been approved 🎉',
    html: buildApprovalHtml((name || '').trim(), voucherCode.trim()),
    fromName: 'Devcon',
  })
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
  })
}
