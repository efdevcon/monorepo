import nodemailer from 'nodemailer'
import { SERVER_CONFIG } from 'utils/config'
import emailTemplates from './email-templates.json'

type EmailTemplates = 'default-email' | 'email-cta'

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

function replace(template: string, data: any) {
  const pattern = /{%\s*(\w+?)\s*%}/g // {%property%}
  return template.replace(pattern, (_, token) => data[token] || '')
}
