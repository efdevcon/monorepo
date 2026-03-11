/**
 * Test script to fetch Pretix questions (attendee information fields)
 * Run with: pnpm run pretix:test-questions
 */
import 'dotenv/config'
import { TICKETING, getPretixApiToken } from '../../config/ticketing'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : `${url}/`
  if (!normalized.includes('/api/')) {
    normalized = `${normalized}api/v1/`
  }
  return normalized
}
const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
const apiToken = getPretixApiToken()
const organizerName = TICKETING.pretix.organizer
const eventName = TICKETING.pretix.event

async function fetchQuestions() {
  console.log('=== Fetching Questions (Attendee Info Fields) ===\n')

  if (!apiToken) {
    console.error('Error: PRETIX_API_TOKEN environment variable is not set')
    process.exit(1)
  }

  try {
    const response = await fetch(
      `${baseUrl}organizers/${organizerName}/events/${eventName}/questions/`,
      {
        headers: {
          Authorization: `Token ${apiToken}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.error('Response:', text)
      return
    }

    const data = await response.json()
    console.log('Questions Response:')
    console.log(JSON.stringify(data, null, 2))

    // Summarize questions
    if (data.results && Array.isArray(data.results)) {
      console.log('\n=== Questions Summary ===')
      for (const q of data.results) {
        console.log(`\nID: ${q.id}`)
        console.log(`  Question: ${JSON.stringify(q.question)}`)
        console.log(`  Type: ${q.type}`)
        console.log(`  Required: ${q.required}`)
        console.log(`  Position: ${q.position}`)
        console.log(`  Ask during checkout: ${q.ask_during_checkin}`)
        if (q.items && q.items.length > 0) {
          console.log(`  Applies to items: ${q.items.join(', ')}`)
        }
        if (q.options && q.options.length > 0) {
          console.log(`  Options:`)
          for (const opt of q.options) {
            console.log(`    - ${opt.id}: ${JSON.stringify(opt.answer)}`)
          }
        }
        if (q.dependency_question) {
          console.log(`  Depends on question: ${q.dependency_question}`)
          console.log(`  Dependency values: ${JSON.stringify(q.dependency_values)}`)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching questions:', error)
  }
}

fetchQuestions()
