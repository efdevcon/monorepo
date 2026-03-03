/**
 * Test script to fetch Pretix event information
 * Run with: pnpm run pretix:test-event
 */
import 'dotenv/config'
import { TICKETING, TICKETING_ENV, getPretixApiToken } from '../../config/ticketing'

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

async function fetchEvent() {
  console.log('=== Fetching Event Info ===\n')
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Organizer: ${organizerName}`)
  console.log(`Event: ${eventName}\n`)

  if (!apiToken) {
    console.error('Error: PRETIX_API_TOKEN environment variable is not set')
    process.exit(1)
  }

  try {
    const response = await fetch(
      `${baseUrl}organizers/${organizerName}/events/${eventName}/`,
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
    console.log('Event Data:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error fetching event:', error)
  }
}

fetchEvent()
