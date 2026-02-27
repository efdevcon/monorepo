/**
 * Setup attendee questions in Pretix backend
 *
 * Creates the following questions for all active admission ticket types:
 * 1. "Country of Nationality" (required, country code dropdown)
 * 2. "Which best describes your role?" (required, single choice dropdown)
 * 3. "Is this your first Devcon/nect event?" (required, boolean radio)
 * 4. "Dietary restrictions" (optional, multiple choice checkboxes)
 * 5. "What are your goals for Devcon?" (optional, multiple choice chips)
 *
 * Usage:
 *   pnpm run pretix:setup-questions
 *
 * Pass --cleanup to remove previously created questions first.
 * Pass --dry-run to preview what would be created without making changes.
 */
import 'dotenv/config'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : url + '/'
  if (!normalized.includes('/api/')) {
    normalized = normalized + 'api/v1/'
  }
  return normalized
}

const baseUrl = normalizeBaseUrl(process.env.PRETIX_BASE_URL || 'https://ticketh.xyz/api/v1/')
const org = process.env.PRETIX_ORGANIZER || 'devcon'
const ev = process.env.PRETIX_EVENT || '7'
const token = process.env.PRETIX_API_TOKEN

if (!token) {
  console.error('PRETIX_API_TOKEN is required')
  process.exit(1)
}

const headers: Record<string, string> = {
  Authorization: 'Token ' + token,
  'Content-Type': 'application/json',
}

function eventUrl(endpoint: string): string {
  return baseUrl + 'organizers/' + org + '/events/' + ev + endpoint
}

async function get(endpoint: string): Promise<any> {
  const url = eventUrl(endpoint)
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('GET ' + endpoint + ' failed (' + res.status + '): ' + text)
  }
  return res.json()
}

async function post(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const url = eventUrl(endpoint)
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('POST ' + endpoint + ' failed (' + res.status + '): ' + text)
  }
  return res.json()
}

async function del(endpoint: string): Promise<boolean> {
  const url = eventUrl(endpoint)
  const res = await fetch(url, { method: 'DELETE', headers })
  return res.ok || res.status === 404
}

// ── Helpers ──

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ── Question definitions ──

const ROLE_OPTIONS = [
  'Developer / Engineer',
  'Designer',
  'Product Manager',
  'Researcher',
  'Student',
  'Founder / Executive',
  'Community Manager',
  'Investor / VC',
  'Marketing / Growth',
  'Content Creator',
  'Educator',
  'Other',
]

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Halal',
  'Nut allergies',
]

const GOALS_OPTIONS = [
  'Networking',
  'Learning',
  'Attending talks & workshops',
  'Participating in hackathon(s)',
  'Unique experiences',
  'Knowledge sharing',
  'Find a job',
  'Host an event',
  'Make new connections',
  'Immerse in the culture',
]

// Identifiers used to find/cleanup questions created by this script
const QUESTION_IDENTIFIERS = [
  'devcon-nationality',
  'devcon-role',
  'devcon-first-event',
  'devcon-dietary',
  'devcon-goals',
]

async function getAdmissionItemIds(): Promise<number[]> {
  const itemsRes = await get('/items/')
  const items = itemsRes.results || []
  return items.filter((item: any) => item.admission && item.active).map((item: any) => item.id)
}

async function cleanup() {
  console.log('=== Cleanup: Removing questions created by this script ===')

  const questionsRes = await get('/questions/')
  const questions = questionsRes.results || []
  let removed = 0

  for (const q of questions) {
    if (QUESTION_IDENTIFIERS.includes(q.identifier)) {
      console.log('  Removing question [' + q.id + '] ' + q.identifier + ': ' + JSON.stringify(q.question))
      await del('/questions/' + q.id + '/')
      removed++
    }
  }

  if (removed === 0) {
    console.log('  No matching questions found')
  }
  console.log('  Cleanup done (' + removed + ' removed)\n')
}

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('')

  const dryRun = process.argv.includes('--dry-run')
  const doCleanup = process.argv.includes('--cleanup')

  if (dryRun) {
    console.log('*** DRY RUN — no changes will be made ***\n')
  }

  if (doCleanup && !dryRun) {
    await cleanup()
  }

  // Get all active admission ticket IDs so questions apply to all ticket types
  const itemIds = await getAdmissionItemIds()
  console.log('Active admission tickets: ' + itemIds.join(', ') + ' (' + itemIds.length + ' total)')
  if (itemIds.length === 0) {
    console.error('No active admission tickets found — aborting')
    process.exit(1)
  }
  console.log('')

  // Check for existing questions to avoid duplicates
  const existingRes = await get('/questions/')
  const existingIdentifiers = new Set(
    (existingRes.results || []).map((q: any) => q.identifier)
  )

  const questions: { identifier: string; payload: Record<string, unknown> }[] = [
    // 1. Country of Nationality (required, country code)
    {
      identifier: 'devcon-nationality',
      payload: {
        question: { en: 'Country of Nationality' },
        type: 'CC',
        required: true,
        position: 0,
        ask_during_checkin: false,
        hidden: false,
        identifier: 'devcon-nationality',
        items: itemIds,
      },
    },
    // 2. Which best describes your role? (required, single choice)
    {
      identifier: 'devcon-role',
      payload: {
        question: { en: 'Which best describes your role?' },
        type: 'C',
        required: true,
        position: 1,
        ask_during_checkin: false,
        hidden: false,
        identifier: 'devcon-role',
        items: itemIds,
        options: ROLE_OPTIONS.map((label, i) => ({
          answer: { en: label },
          identifier: slugify(label),
          position: i,
        })),
      },
    },
    // 3. Is this your first Devcon/nect event? (required, boolean)
    {
      identifier: 'devcon-first-event',
      payload: {
        question: { en: 'Is this your first Devcon/nect event?' },
        type: 'B',
        required: true,
        position: 2,
        ask_during_checkin: false,
        hidden: false,
        identifier: 'devcon-first-event',
        items: itemIds,
      },
    },
    // 4. Dietary restrictions (optional, multiple choice)
    {
      identifier: 'devcon-dietary',
      payload: {
        question: { en: 'Dietary restrictions' },
        type: 'M',
        required: false,
        position: 3,
        ask_during_checkin: false,
        hidden: false,
        identifier: 'devcon-dietary',
        items: itemIds,
        options: DIETARY_OPTIONS.map((label, i) => ({
          answer: { en: label },
          identifier: slugify(label),
          position: i,
        })),
      },
    },
    // 5. What are your goals for Devcon? (optional, multiple choice)
    {
      identifier: 'devcon-goals',
      payload: {
        question: { en: 'What are your goals for Devcon?' },
        type: 'M',
        required: false,
        position: 4,
        ask_during_checkin: false,
        hidden: false,
        identifier: 'devcon-goals',
        items: itemIds,
        options: GOALS_OPTIONS.map((label, i) => ({
          answer: { en: label },
          identifier: slugify(label),
          position: i,
        })),
      },
    },
  ]

  // Create questions
  const created: { id: number; identifier: string; question: string }[] = []

  for (const q of questions) {
    if (existingIdentifiers.has(q.identifier)) {
      console.log('SKIP [' + q.identifier + '] — already exists')
      continue
    }

    if (dryRun) {
      console.log('WOULD CREATE [' + q.identifier + '] type=' + q.payload.type + ' required=' + q.payload.required)
      if (q.payload.options) {
        const opts = q.payload.options as { answer: { en: string } }[]
        console.log('  Options: ' + opts.map((o) => o.answer.en).join(', '))
      }
      continue
    }

    console.log('Creating [' + q.identifier + ']...')
    const result = await post('/questions/', q.payload)
    created.push({
      id: result.id,
      identifier: result.identifier,
      question: JSON.stringify(result.question),
    })
    console.log('  Created question [' + result.id + '] ' + JSON.stringify(result.question))
    if (result.options && result.options.length > 0) {
      for (const opt of result.options) {
        console.log('    Option [' + opt.id + '] ' + JSON.stringify(opt.answer))
      }
    }
  }

  if (dryRun) {
    console.log('\n*** DRY RUN complete — re-run without --dry-run to apply ***')
    return
  }

  // ── Verification ──
  console.log('\n=== Verification ===')
  const verifyRes = await get('/questions/')
  const allQuestions = verifyRes.results || []
  const ours = allQuestions.filter((q: any) => QUESTION_IDENTIFIERS.includes(q.identifier))
  console.log('  Total questions on event: ' + allQuestions.length)
  console.log('  Created by this script: ' + ours.length)
  for (const q of ours) {
    const optCount = (q.options || []).length
    console.log(
      '    [' + q.id + '] ' + q.identifier +
      ' type=' + q.type +
      ' required=' + q.required +
      ' items=' + (q.items || []).length +
      (optCount > 0 ? ' options=' + optCount : '')
    )
  }

  console.log('\n=== Done! ===')
  for (const c of created) {
    console.log('  ' + c.identifier + ' → ID ' + c.id)
  }
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
