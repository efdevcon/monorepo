/**
 * Email classifier — port of the Mastra work-email-classifier tool + agent.
 * Two-step: heuristic classification, then LLM enrichment via GPT-4.1-nano.
 */

import { parse as parseDomain } from 'tldts'
import OpenAI from 'openai'
import { WHITELISTED_UNIVERSITY_DOMAINS } from './whitelisted-domains'

// ── Domain lists ──────────────────────────────────────────────────────

const PERSONAL_DOMAIN_EXACT = new Set([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'pm.me',
  'proton.me',
  'protonmail.com',
  'tuta.com',
  'tutanota.com',
  'fastmail.com',
  'hey.com',
  'mail.com',
  'mail.ru',
  'mail.ua',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'yandex.com',
  'yandex.ru',
  'yandex.kz',
  'yandex.by',
  'yandex.ua',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'sohu.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'seznam.cz',
  'centrum.cz',
  'abv.bg',
  'rediffmail.com',
  'inbox.com',
  'hushmail.com',
  'mailbox.org',
  'posteo.de',
  'runbox.com',
  'startmail.com',
  'zoho.com',
  'zoho.eu',
  'aol.com',
  'aim.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
])

const PERSONAL_DOMAIN_SLD = new Set([
  'gmail',
  'googlemail',
  'yahoo',
  'ymail',
  'rocketmail',
  'outlook',
  'hotmail',
  'live',
  'msn',
  'aol',
  'icloud',
  'proton',
  'protonmail',
  'tuta',
  'tutanota',
  'gmx',
  'yandex',
  'qq',
  '163',
  '126',
  'naver',
  'daum',
  'hanmail',
  'seznam',
  'centrum',
  'abv',
  'rediffmail',
  'inbox',
  'hushmail',
  'mailbox',
  'posteo',
  'fastmail',
  'hey',
  'runbox',
  'startmail',
  'zoho',
])

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'throwawaymail.com',
  'dispostable.com',
  'mintemail.com',
  'fakeinbox.com',
  'burnermail.io',
  'sharklasers.com',
  'mailnesia.com',
  'mailnull.com',
  'spamgourmet.com',
])

const DISPOSABLE_KEYWORDS = [
  'tempmail',
  'temp-mail',
  '10minutemail',
  'guerrillamail',
  'mailinator',
  'yopmail',
  'trashmail',
  'throwaway',
  'disposable',
  'burner',
  'fakeinbox',
  'maildrop',
  'getnada',
  'mailnesia',
  'spamgourmet',
]

// Whitelisted university domains imported from ./whitelisted-domains.ts

// ── Helpers ───────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getRootDomain = (domain: string) => {
  const parsed = parseDomain(domain)
  if (parsed.domain) return parsed.domain
  const parts = domain.split('.').filter(Boolean)
  if (parts.length <= 1) return domain
  return `${parts.at(-2)}.${parts.at(-1)}`
}

const getPublicSuffix = (domain: string) => {
  const parsed = parseDomain(domain)
  return parsed.publicSuffix ?? domain.split('.').slice(1).join('.')
}

const getSecondLevelDomain = (rootDomain: string, publicSuffix?: string | null) => {
  if (!publicSuffix) return rootDomain.split('.')[0] ?? rootDomain
  if (!rootDomain.endsWith(`.${publicSuffix}`)) return rootDomain.split('.')[0] ?? rootDomain
  return rootDomain.slice(0, -(publicSuffix.length + 1))
}

const isEducationSuffix = (publicSuffix?: string | null) => {
  if (!publicSuffix) return false
  if (publicSuffix === 'edu') return true
  return publicSuffix.startsWith('edu.') || publicSuffix.startsWith('ac.') || publicSuffix.startsWith('sch.')
}

const hasEducationToken = (rootDomain: string) => {
  const tokens = rootDomain.split(/[-.]/)
  return tokens.some(t => ['university', 'college', 'institute', 'academy', 'polytechnic', 'school'].includes(t))
}

const isGovernmentSuffix = (publicSuffix?: string | null) => {
  if (!publicSuffix) return false
  return publicSuffix === 'gov' || publicSuffix.startsWith('gov.') || publicSuffix.startsWith('mil.')
}

const isDisposableDomain = (rootDomain: string) =>
  DISPOSABLE_DOMAINS.has(rootDomain) || DISPOSABLE_KEYWORDS.some(k => rootDomain.includes(k))

const isPersonalDomain = (rootDomain: string, sld: string) =>
  PERSONAL_DOMAIN_EXACT.has(rootDomain) || PERSONAL_DOMAIN_SLD.has(sld)

// ── Public API ────────────────────────────────────────────────────────

export type OrganizationType = 'personal' | 'organization' | 'university' | 'government' | 'disposable' | 'unknown'

export interface EmailClassification {
  email: string
  isPersonal: boolean
  isUniversity: boolean
  isGovernment: boolean
  isDisposable: boolean
  organizationType: OrganizationType
  rootDomain: string | null
  publicSuffix: string | null
  signals: string[]
}

export function classifyEmail(rawEmail: string): EmailClassification {
  const email = rawEmail.trim().toLowerCase()
  const signals: string[] = []

  if (!EMAIL_REGEX.test(email)) {
    return {
      email,
      isPersonal: false,
      isUniversity: false,
      isGovernment: false,
      isDisposable: false,
      organizationType: 'unknown',
      rootDomain: null,
      publicSuffix: null,
      signals: ['invalid_email_format'],
    }
  }

  const domain = email.split('@')[1]!
  const rootDomain = getRootDomain(domain)
  const publicSuffix = getPublicSuffix(domain)
  const sld = getSecondLevelDomain(rootDomain, publicSuffix)

  const isDisposable = isDisposableDomain(rootDomain)
  const isFreeProvider = isPersonalDomain(rootDomain, sld)
  const educationSuffix = isEducationSuffix(publicSuffix)
  const educationToken = hasEducationToken(rootDomain)
  const isWhitelisted = WHITELISTED_UNIVERSITY_DOMAINS.has(rootDomain) || WHITELISTED_UNIVERSITY_DOMAINS.has(domain)
  const isUniversity = educationSuffix || educationToken || isWhitelisted
  const isGovernment = isGovernmentSuffix(publicSuffix)
  const isPersonal = (isFreeProvider || isDisposable) && !isWhitelisted

  if (isDisposable) signals.push('disposable_domain')
  if (isFreeProvider && !isWhitelisted) signals.push('personal_provider_domain')
  if (isWhitelisted) signals.push('whitelisted_university_domain')
  if (educationSuffix) signals.push('education_suffix')
  if (educationToken) signals.push('education_token')
  if (isGovernment) signals.push('government_suffix')

  let organizationType: OrganizationType = 'organization'
  if (isDisposable && !isWhitelisted) organizationType = 'disposable'
  else if (isPersonal) organizationType = 'personal'
  else if (isUniversity) organizationType = 'university'
  else if (isGovernment) organizationType = 'government'

  return {
    email,
    isPersonal,
    isUniversity,
    isGovernment,
    isDisposable,
    organizationType,
    rootDomain,
    publicSuffix,
    signals,
  }
}

// ── AI enrichment (mirrors the Mastra agent) ─────────────────────────

const AGENT_INSTRUCTIONS = `You classify whether an email is personal or work/organization based on domain.

INPUT:
- A JSON object with the heuristic classification of an email.

RULES:
- Custom personal domains and alumni domains do NOT count as personal.
- Use domain-based signals; names are weak signals and never flip a domain to personal.
- Do not use web search or external sources.
- You may use your built-in knowledge of well-known domains and organizations.

PROCESS:
1. Use the heuristic output as a base.
2. If you confidently recognize the domain/provider/organization, adjust fields like isPersonal, organizationType, isUniversity, isGovernment.
3. When you adjust, add a signal like "llm_domain_knowledge" or "llm_org_enriched" to the signals array.
4. Keep the same keys as the input. Do not add new keys.

OUTPUT:
- JSON only. No markdown, no prose, no extra keys.`

export async function classifyEmailWithAI(rawEmail: string): Promise<EmailClassification> {
  const heuristic = classifyEmail(rawEmail)

  // If heuristic already confidently identified it as personal/university/government, skip AI
  if (heuristic.isPersonal || heuristic.isUniversity || heuristic.isGovernment || heuristic.isDisposable) {
    return heuristic
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY })

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      temperature: 0,
      messages: [
        { role: 'system', content: AGENT_INSTRUCTIONS },
        { role: 'user', content: JSON.stringify(heuristic) },
      ],
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) return heuristic

    const enriched = JSON.parse(content) as EmailClassification
    return enriched
  } catch {
    // Fall back to heuristic if AI fails
    return heuristic
  }
}
