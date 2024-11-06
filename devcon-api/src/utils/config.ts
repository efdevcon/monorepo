import fs from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'
dotenv.config()

const packageFile = fs.readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
const packageData = JSON.parse(packageFile)

export const DEVCON_INFO = {
  title: 'Devcon',
  description: 'Devcon is the Ethereum conference for developers, researchers, thinkers, and makers.',
  website: 'https://devcon.org/',
}

export const API_INFO = {
  title: `${DEVCON_INFO.title} API`,
  description: packageData.description,
  website: packageData.homepage,
  email: packageData.author,
  documentation: `${packageData.homepage}/docs`,
  repository: packageData.repository.url,
  host: packageData.homepage.replace('https://', ''),
  version: packageData.version,
  license: packageData.license,
}

export const API_DEFAULTS = {
  SIZE: 20,
  ORDER: 'desc',
  githubDataUrl: 'https://raw.githubusercontent.com/efdevcon/api/dev/data',
}

export const CONFIG = {
  DATA_FOLDER: join(process.cwd(), 'data'),
}

export const SERVER_CONFIG = {
  NODE_ENV: process.env.RENDER ? 'production' : process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 4000,

  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  NEYNAR_API_KEY: process.env.NEYNAR_API_KEY,

  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,

  API_KEYS: process.env.API_KEYS ? process.env.API_KEYS.split(',') : [],

  SMTP_DEFAULT_FROM_NAME: process.env.SMTP_DEFAULT_FROM_NAME || DEVCON_INFO.title,
  SMTP_DEFAULT_FROM: process.env.SMTP_DEFAULT_FROM || API_INFO.email,
  SMTP_SERVICE: process.env.SMTP_SERVICE,
  SMTP_USERNAME: process.env.SMTP_USERNAME,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
}

export const PRETALX_CONFIG = {
  PRETALX_API_KEY: process.env.PRETALX_API_KEY,

  PRETALX_BASE_URI: 'https://speak.devcon.org/api', // 'https://speak.devcon.org/api' // https://speak.ticketh.xyz/api
  PRETALX_EVENT_NAME: 'devcon7-sea', // 'devcon-vi-2022' // 'pwa-data'
  PRETALX_EVENT_ID: 7,

  // FIX ME: Update this fictional email question ID
  PRETALX_QUESTIONS_EMAIL: 1337,
  PRETALX_QUESTIONS_GITHUB: 61,
  PRETALX_QUESTIONS_TWITTER: 62,
  PRETALX_QUESTIONS_WEBSITE: 63,
  PRETALX_QUESTIONS_FARCASTER: 78,
  PRETALX_QUESTIONS_LENS: 79,
  PRETALX_QUESTIONS_ENS: 75,
  PRETALX_QUESTIONS_TELEGRAM: 103,

  PRETALX_QUESTIONS_EXPERTISE: 71,
  PRETALX_QUESTIONS_AUDIENCE: 72,
  PRETALX_QUESTIONS_TAGS: 76,
  PRETALX_QUESTIONS_KEYWORDS: 73,

  DEFAULT_LIMIT: 100,
}

export const SESSION_CONFIG = {
  cookieName: API_INFO.title,
  password: process.env.SESSION_SECRET || 'default-test-session-secret-for-iron-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
}
