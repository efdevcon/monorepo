/**
 * Smoke-test the Pretalx approved-speaker eligibility used by the visa gate.
 *
 *   ts-node src/scripts/test-speaker-eligibility.ts [email-to-check]
 *
 * Requires PRETALX_BASE_URL / PRETALX_EVENT_SLUG / PRETALX_API_KEY in .env.
 * Tip: point these at the mumbai playground for a known-good run.
 */
import 'dotenv/config'
import { getApprovedSpeakerEmails, isApprovedSpeaker } from 'services/pretalx'

function maskEmail(e: string): string {
  const [user, domain] = e.split('@')
  if (!domain) return '***'
  return `${user.slice(0, 2)}***@${domain}`
}

async function main() {
  const email = process.argv[2]

  console.log('PRETALX_BASE_URL   =', process.env.PRETALX_BASE_URL ?? '(unset)')
  console.log('PRETALX_EVENT_SLUG =', process.env.PRETALX_EVENT_SLUG ?? '(unset)')
  console.log('PRETALX_API_KEY    =', process.env.PRETALX_API_KEY ? '(set)' : '(unset)')

  if (!process.env.PRETALX_BASE_URL || !process.env.PRETALX_EVENT_SLUG || !process.env.PRETALX_API_KEY) {
    console.error('\nMissing PRETALX_* env vars — add them to devcon/.env and retry.')
    process.exit(1)
  }

  const emails = await getApprovedSpeakerEmails()
  console.log(`\nApproved (accepted/confirmed) speaker emails: ${emails.size}`)
  if (emails.size > 0) {
    console.log('Sample:', [...emails].slice(0, 3).map(maskEmail).join(', '))
  } else {
    console.log('⚠️  Empty set — likely a token without access to speaker emails, or wrong event slug.')
  }

  if (email) {
    const ok = await isApprovedSpeaker(email)
    console.log(`\nisApprovedSpeaker("${email}") → ${ok}`)
  } else {
    console.log('\nPass an email as the first arg to check a specific person.')
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
