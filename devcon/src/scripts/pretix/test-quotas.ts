/**
 * Test script to fetch Pretix quotas (availability)
 * Run with: npx ts-node src/scripts/pretix/test-quotas.ts
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

async function fetchQuotas() {
  console.log('=== Fetching Quotas (Availability) ===\n')

  if (!apiToken) {
    console.error('Error: PRETIX_API_TOKEN environment variable is not set')
    process.exit(1)
  }

  try {
    // First get all quotas
    const response = await fetch(
      `${baseUrl}organizers/${organizerName}/events/${eventName}/quotas/`,
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
    console.log('Quotas Response:')
    console.log(JSON.stringify(data, null, 2))

    // Fetch availability for each quota
    if (data.results && Array.isArray(data.results)) {
      console.log('\n=== Quotas with Availability ===')
      for (const quota of data.results) {
        console.log(`\nQuota ID: ${quota.id}`)
        console.log(`  Name: ${quota.name}`)
        console.log(`  Size: ${quota.size}`)
        console.log(`  Items: ${quota.items.join(', ')}`)

        // Fetch availability
        try {
          const availResponse = await fetch(
            `${baseUrl}organizers/${organizerName}/events/${eventName}/quotas/${quota.id}/availability/`,
            {
              headers: {
                Authorization: `Token ${apiToken}`,
              },
            }
          )
          if (availResponse.ok) {
            const availData = await availResponse.json()
            console.log(`  Available: ${availData.available}`)
            console.log(`  Available number: ${availData.available_number}`)
            console.log(`  Total size: ${availData.total_size}`)
            console.log(`  Pending orders: ${availData.pending_orders}`)
            console.log(`  Paid orders: ${availData.paid_orders}`)
          }
        } catch (e) {
          console.log(`  Could not fetch availability: ${e}`)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching quotas:', error)
  }
}

fetchQuotas()
