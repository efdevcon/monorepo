/**
 * Test script to fetch Pretix categories (item groupings)
 * Run with: pnpm run pretix:test-categories
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

async function fetchCategories() {
  console.log('=== Fetching Categories ===\n')

  if (!apiToken) {
    console.error('Error: PRETIX_API_TOKEN environment variable is not set')
    process.exit(1)
  }

  try {
    const response = await fetch(
      `${baseUrl}organizers/${organizerName}/events/${eventName}/categories/`,
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
    console.log('Categories Response:')
    console.log(JSON.stringify(data, null, 2))

    // Summarize categories
    if (data.results && Array.isArray(data.results)) {
      console.log('\n=== Categories Summary ===')
      for (const cat of data.results) {
        console.log(`\nID: ${cat.id}`)
        console.log(`  Name: ${JSON.stringify(cat.name)}`)
        console.log(`  Description: ${JSON.stringify(cat.description)}`)
        console.log(`  Position: ${cat.position}`)
        console.log(`  Is addon: ${cat.is_addon}`)
      }
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

fetchCategories()
