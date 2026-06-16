/**
 * Pretalx speaker-eligibility service.
 *
 * Used by the visa-letter gate to allow approved Devcon speakers (by email) in
 * addition to paid ticket holders. Speaker approval changes rarely, so the full
 * set of approved-speaker emails is fetched once and cached in-memory with a
 * TTL — per-request checks are then a cheap Set lookup that never hits Pretalx.
 * In-flight requests are de-duped so a burst of submits triggers a single fetch.
 *
 * Config is env-driven (set these in the Netlify runtime env):
 *   PRETALX_BASE_URL   — API base incl. /api, e.g. https://speak.devcon.org/api
 *   PRETALX_EVENT_SLUG — event slug, e.g. devcon-8
 *   PRETALX_API_KEY    — organizer/team token (needs access to speaker emails)
 */
import 'dotenv/config'

const BASE_URL = process.env.PRETALX_BASE_URL
const EVENT_SLUG = process.env.PRETALX_EVENT_SLUG
const API_KEY = process.env.PRETALX_API_KEY

// A speaker counts as "approved" if any of their submissions is in one of these
// states (accepted = offered a slot, confirmed = speaker accepted the slot).
const APPROVED_STATES: readonly string[] = ['accepted', 'confirmed']

// Approved-speaker emails change rarely — cache the whole set for 10 minutes.
const CACHE_TTL_MS = 10 * 60 * 1000

interface PretalxPaginated<T> {
  count: number
  next: string | null
  results: T[]
}

interface PretalxSpeaker {
  code: string
  email: string | null
  submissions: string[]
}

interface PretalxSubmission {
  code: string
  state: string
}

let cache: { emails: Set<string>; expiresAt: number } | null = null
let inflight: Promise<Set<string>> | null = null

function isConfigured(): boolean {
  return Boolean(BASE_URL && EVENT_SLUG && API_KEY)
}

function apiBase(): string {
  return `${(BASE_URL as string).replace(/\/+$/, '')}/events/${EVENT_SLUG}`
}

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const results: T[] = []
  let url: string | null = `${apiBase()}/${endpoint}`

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Token ${API_KEY}`, 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Pretalx API error ${response.status}: ${text}`)
    }
    const data: PretalxPaginated<T> = await response.json()
    results.push(...(data.results ?? []))
    url = data.next
  }

  return results
}

async function loadApprovedSpeakerEmails(): Promise<Set<string>> {
  // Submissions carry the state; speakers carry the email + their submission
  // codes. Cross-reference: a speaker is approved if any of their submissions is
  // in an approved state. (Pretalx returns submission `speakers` as bare codes,
  // so we resolve emails from the dedicated /speakers endpoint.)
  const [speakers, submissions] = await Promise.all([
    fetchAllPages<PretalxSpeaker>('speakers/'),
    fetchAllPages<PretalxSubmission>('submissions/'),
  ])

  const approvedCodes = new Set(submissions.filter(s => APPROVED_STATES.includes(s.state)).map(s => s.code))

  const emails = new Set<string>()
  for (const speaker of speakers) {
    if (!speaker.email) continue
    if ((speaker.submissions ?? []).some(code => approvedCodes.has(code))) {
      emails.add(speaker.email.toLowerCase().trim())
    }
  }
  return emails
}

export async function getApprovedSpeakerEmails(): Promise<Set<string>> {
  if (cache && Date.now() < cache.expiresAt) return cache.emails
  if (inflight) return inflight

  inflight = loadApprovedSpeakerEmails()
    .then(emails => {
      cache = { emails, expiresAt: Date.now() + CACHE_TTL_MS }
      inflight = null
      return emails
    })
    .catch(err => {
      inflight = null
      throw err
    })

  return inflight
}

/**
 * Whether `email` belongs to an approved (accepted or confirmed) Devcon speaker.
 *
 * Fails closed: if Pretalx isn't configured or the lookup errors, returns false
 * so eligibility never opens up due to an outage. The visa gate still allows
 * ticket holders independently.
 */
export async function isApprovedSpeaker(email: string): Promise<boolean> {
  if (!isConfigured()) return false
  try {
    const emails = await getApprovedSpeakerEmails()
    return emails.has(email.toLowerCase().trim())
  } catch (err) {
    console.error('[pretalx/isApprovedSpeaker] lookup failed', (err as Error).message)
    return false
  }
}
