/**
 * Test script to fetch Pretix categories (item groupings)
 * Run with: pnpm run pretix:test-categories
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
