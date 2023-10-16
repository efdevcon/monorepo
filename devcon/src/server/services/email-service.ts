import nodemailer, { Transporter } from 'nodemailer'
import { SERVER_CONFIG } from 'utils/server'
import emailTemplates from './email-templates.json'

require('dotenv').config()

type EmailTemplates = 'default-email' | 'email-cta'

export interface EmailServiceInterface {
  sendMail(to: string, template: EmailTemplates, subject: string, properties: { [key: string]: any }): void
}

export class EmailService implements EmailServiceInterface {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: SERVER_CONFIG.SMTP_SERVICE,
      port: 465,
      secure: true,
      auth: {
        user: SERVER_CONFIG.SMTP_USERNAME,
        pass: SERVER_CONFIG.SMTP_PASSWORD
      }
    })
  }

  async sendMail(to: string, template: EmailTemplates, subject: string, properties: { [key: string]: string }) {
    const from = `"${SERVER_CONFIG.SMTP_DEFAULT_FROM_NAME}" <${SERVER_CONFIG.SMTP_DEFAULT_FROM}>`
    let text = replace(emailTemplates.defaultEmail.text.join('\n'), properties)
    let html = replace(emailTemplates.defaultEmail.html, properties).replace(/(?:\r\n|\r|\n)/g, '<br>')

    if (template === 'email-cta') {
      text = replace(emailTemplates.ctaEmail.text.join('\n'), properties)
      html = replace(emailTemplates.ctaEmail.html, properties).replace(/(?:\r\n|\r|\n)/g, '<br>')
    }
    
    const response = await this.transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      text: text,
      html: html,
    })
    
    console.debug('Email response', response)
  }
}

function replace(template: string, data: any) {
  const pattern = /{%\s*(\w+?)\s*%}/g; // {%property%}
  return template.replace(pattern, (_, token) => data[token] || '')
}