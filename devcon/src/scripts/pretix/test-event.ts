/**
 * Test script to fetch Pretix event information
 * Run with: pnpm run pretix:test-event
 */
import 'dotenv/config'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : `${url}/`
  if (!normalized.includes('/api/')) {
    normalized = `${normalized}api/v1/`
  }
  return normalized
}
const baseUrl = normalizeBaseUrl(process.env.PRETIX_BASE_URL || 'https://ticketh.xyz/api/v1/')
const apiToken = process.env.PRETIX_API_TOKEN
const organizerName = process.env.PRETIX_ORGANIZER || 'devcon'
const eventName = process.env.PRETIX_EVENT || '7'

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
