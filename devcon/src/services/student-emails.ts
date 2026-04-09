import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVICE,
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
})

const FROM = `"${process.env.SMTP_DEFAULT_FROM_NAME || 'Devcon'}" <${process.env.SMTP_DEFAULT_FROM || 'support@devcon.org'}>`

export async function sendVoucherGrantedEmail(to: string, name: string, voucherCode: string) {
  const subject = 'Your Devcon Student Discount Has Been Approved!'

  const html = buildEmail(`
    <h2 style="font-family: sans-serif; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      🎉 Your Student Discount Has Been Approved!
    </h2>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      Hi ${escapeHtml(name)},
    </p>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      Great news! Your student discount application for Devcon India has been approved.
    </p>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      Your voucher code is:
    </p>
    <div style="background-color: #f0fdf4; border: 2px solid #6ee7b7; border-radius: 8px; padding: 16px 24px; text-align: center; margin-bottom: 15px;">
      <strong style="font-size: 20px; letter-spacing: 2px; color: #065f46; font-family: monospace;">${escapeHtml(voucherCode)}</strong>
    </div>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      Use this code when purchasing your ticket at <a href="https://devcon.org/tickets" style="color: #7235ed;">devcon.org/tickets</a> to receive your student discount.
    </p>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      See you in India! 🇮🇳
    </p>
  `)

  const text = [
    '🎉 Your Student Discount Has Been Approved!',
    '',
    `Hi ${name},`,
    '',
    'Great news! Your student discount application for Devcon India has been approved.',
    '',
    `Your voucher code is: ${voucherCode}`,
    '',
    'Use this code when purchasing your ticket at https://devcon.org/tickets to receive your student discount.',
    '',
    'See you in India! 🇮🇳',
  ].join('\n')

  return sendEmail(to, subject, html, text)
}

export async function sendRejectionEmail(to: string, name: string) {
  const subject = 'Update on Your Devcon Student Discount Application'

  const html = buildEmail(`
    <h2 style="font-family: sans-serif; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      Update on Your Application
    </h2>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      Hi ${escapeHtml(name)},
    </p>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      Thank you for applying for a student discount for Devcon India. After careful review, we were unfortunately unable to approve your application at this time.
    </p>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      This may be due to limited availability or eligibility requirements. We encourage you to explore other ticket options, including community discounts and general admission.
    </p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
      <tbody><tr><td align="center" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
          <tbody><tr><td style="font-family: sans-serif; font-size: 14px; vertical-align: top; background-color: #30354b; text-align: center;">
            <a href="https://devcon.org/tickets" target="_blank" style="display: inline-block; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-transform: capitalize; color: #ffffff;">View Ticket Options</a>
          </td></tr></tbody>
        </table>
      </td></tr></tbody>
    </table>
    <p style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; Margin-bottom: 15px;">
      If you have any questions, please reach out to us at <a href="mailto:support@devcon.org" style="color: #7235ed;">support@devcon.org</a>.
    </p>
  `)

  const text = [
    'Update on Your Application',
    '',
    `Hi ${name},`,
    '',
    'Thank you for applying for a student discount for Devcon India. After careful review, we were unfortunately unable to approve your application at this time.',
    '',
    'This may be due to limited availability or eligibility requirements. We encourage you to explore other ticket options, including community discounts and general admission.',
    '',
    'View Ticket Options: https://devcon.org/tickets',
    '',
    'If you have any questions, please reach out to us at support@devcon.org.',
  ].join('\n')

  return sendEmail(to, subject, html, text)
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  try {
    const response = await transporter.sendMail({ from: FROM, to, subject, html, text })
    return response.accepted.length > 0
  } catch (err) {
    console.error('Failed to send email:', err)
    return false
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildEmail(body: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>Devcon</title></head><body style="background-color: #F8F8F8; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; width: 100%; background-color: #F8F8F8;"><tr><td>&nbsp;</td><td class="container" style="display: block; Margin: 0 auto; max-width: 580px; padding: 10px; width: 580px;"><div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;"><div style="text-align: center; padding-bottom: 15px;"><img src="https://devcon.org/assets/images/devcon-logo.png" alt="Devcon" width="200" height="62" border="0" style="border:0;"></div><table role="presentation" class="main" style="width: 100%; background: #ffffff; border-radius: 3px;"><tr><td class="wrapper" style="box-sizing: border-box; padding: 20px; color: #30354b;">${body}</td></tr></table><div style="text-align: center; padding-top: 10px; font-size: 12px; color: #9098a1;"><p>You are receiving this email as a service notification from devcon.org.</p><p>If you didn't expect this email, please contact us at <a href="mailto:support@devcon.org" style="color: #9098a1;">support@devcon.org</a>.</p><p>&copy; 2026 &mdash; Devcon.org</p></div></div></td><td>&nbsp;</td></tr></table></body></html>`
}
