/**
 * Test script to fetch Pretix items (products/tickets)
 * Run with: pnpm run pretix:test-items
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

async function fetchItems() {
  console.log('=== Fetching Items (Products/Tickets) ===\n')

  if (!apiToken) {
    console.error('Error: PRETIX_API_TOKEN environment variable is not set')
    process.exit(1)
  }

  try {
    const response = await fetch(
      `${baseUrl}organizers/${organizerName}/events/${eventName}/items/`,
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
    console.log('Items Response:')
    console.log(JSON.stringify(data, null, 2))

    // Summarize items
    if (data.results && Array.isArray(data.results)) {
      console.log('\n=== Items Summary ===')
      for (const item of data.results) {
        console.log(`\nID: ${item.id}`)
        console.log(`  Name: ${JSON.stringify(item.name)}`)
        console.log(`  Price: ${item.default_price}`)
        console.log(`  Active: ${item.active}`)
        console.log(`  Category: ${item.category}`)
        console.log(`  Admission: ${item.admission}`)
        if (item.addons && item.addons.length > 0) {
          console.log(`  Addons: ${JSON.stringify(item.addons)}`)
        }
        if (item.variations && item.variations.length > 0) {
          console.log(`  Variations: ${item.variations.length}`)
          for (const v of item.variations) {
            console.log(`    - ${v.id}: ${JSON.stringify(v.value)} (${v.default_price || 'same price'})`)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching items:', error)
  }
}

fetchItems()
