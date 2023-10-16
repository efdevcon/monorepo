import * as dotenv from 'dotenv'

dotenv.config()

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('Required SESSION_SECRET not found.')

export const SERVER_CONFIG = {
  NODE_ENV: process.env.NODE_ENV,

  SESSION_SECRET: process.env.SESSION_SECRET || 'default-test-session-secret-for-iron-session',
  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING || '',
  ELASTIC_ENDPOINT: process.env.ELASTIC_ENDPOINT || '',

  SMTP_DEFAULT_FROM_NAME: process.env.SMTP_DEFAULT_FROM_NAME || 'Devcon',
  SMTP_DEFAULT_FROM: process.env.SMTP_DEFAULT_FROM || 'support@devcon.org',
  SMTP_SERVICE: process.env.SMTP_SERVICE,
  SMTP_USERNAME: process.env.SMTP_USERNAME,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
}

export const SESSION_CONFIG = {
  cookieName: "Devcon App",
  password: SERVER_CONFIG.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  }
}