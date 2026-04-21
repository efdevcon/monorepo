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
  githubDataUrl: 'https://raw.githubusercontent.com/efdevcon/monorepo/main/devcon-api/data',
}

export const CONFIG = {
  DATA_FOLDER: join(process.cwd(), 'data'),
}

export const SERVER_CONFIG = {
  NODE_ENV: process.env.RENDER ? 'production' : process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 4000,

  GITHUB_TOKEN: process.env.GITHUB_TOKEN,

  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,

  API_KEYS: process.env.API_KEYS ? process.env.API_KEYS.split(',') : [],

  SMTP_DEFAULT_FROM_NAME: process.env.SMTP_DEFAULT_FROM_NAME || DEVCON_INFO.title,
  SMTP_DEFAULT_FROM: process.env.SMTP_DEFAULT_FROM || API_INFO.email,
  SMTP_SERVICE: process.env.SMTP_SERVICE,
  SMTP_USERNAME: process.env.SMTP_USERNAME,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,

  ACCREDITATION_GUIDE_URL: process.env.ACCREDITATION_GUIDE_URL || '',

  WHITELIST_JWT_SECRET: process.env.WHITELIST_JWT_SECRET || '',
  WHITELIST_FORM_URL: process.env.WHITELIST_FORM_URL || '',
  WHITELIST_FORM_TOKEN_FIELD: process.env.WHITELIST_FORM_TOKEN_FIELD || 'entry.123456789',

  NOCODB_URL: process.env.NOCODB_URL || '',
  NOCODB_API_TOKEN: process.env.NOCODB_API_TOKEN || '',
  NOCODB_WEBHOOK_SECRET: process.env.NOCODB_WEBHOOK_SECRET || '',
  NOCODB_TABLES: parseNocoDbTables(process.env.NOCODB_TABLES),
}

function parseNocoDbTables(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>
  } catch {
    console.error('Invalid NOCODB_TABLES env var; expected JSON object mapping tableId → name')
  }
  return {}
}

export interface PretalxInstanceConfig {
  eventId: string
  PRETALX_API_KEY: string | undefined
  PRETALX_BASE_URI: string
  PRETALX_EVENT_NAME: string

  PRETALX_QUESTIONS_GITHUB?: number
  PRETALX_QUESTIONS_TWITTER?: number
  PRETALX_QUESTIONS_WEBSITE?: number
  PRETALX_QUESTIONS_FARCASTER?: number
  PRETALX_QUESTIONS_LENS?: number
  PRETALX_QUESTIONS_ENS?: number
  PRETALX_QUESTIONS_TELEGRAM?: number

  PRETALX_QUESTIONS_EXPERTISE?: number
  PRETALX_QUESTIONS_AUDIENCE?: number
  PRETALX_QUESTIONS_TAGS?: number
  PRETALX_QUESTIONS_KEYWORDS?: number

  DEFAULT_LIMIT: number
}

export const PRETALX_INSTANCES: Record<string, PretalxInstanceConfig> = {
  'devcon-7': {
    eventId: 'devcon-7',
    PRETALX_API_KEY: process.env.PRETALX_API_KEY,
    PRETALX_BASE_URI: 'https://speak.devcon.org/api',
    PRETALX_EVENT_NAME: 'devcon7-sea',

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
  },
  'devcon-mumbai-playground': {
    eventId: 'devcon-mumbai-playground',
    PRETALX_API_KEY: process.env.PRETALX_API_KEY_MUMBAI,
    PRETALX_BASE_URI: 'https://mum.speakat.xyz/api',
    PRETALX_EVENT_NAME: 'devcon-mumbai-playground',
    DEFAULT_LIMIT: 100,
  },
}

// Backward compat: default to devcon-7
export const PRETALX_CONFIG = PRETALX_INSTANCES['devcon-7']

export function getPretalxConfig(eventId: string): PretalxInstanceConfig {
  const config = PRETALX_INSTANCES[eventId]
  if (!config) throw new Error(`Unknown pretalx instance: ${eventId}`)
  return config
}

// Reverse lookup: find eventId from pretalx event slug
export function getEventIdByPretalxSlug(slug: string): string | undefined {
  return Object.values(PRETALX_INSTANCES).find((c) => c.PRETALX_EVENT_NAME === slug)?.eventId
}
