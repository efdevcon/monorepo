/**
 * Comprehensive test script to fetch all relevant Pretix API data
 * Run with: npx ts-node src/scripts/pretix/test-all.ts
 */
import 'dotenv/config'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : `${url}/`
  // Add api/v1/ if not present
  if (!normalized.includes('/api/')) {
    normalized = `${normalized}api/v1/`
  }
  return normalized
}
const baseUrl = normalizeBaseUrl(process.env.PRETIX_BASE_URL || 'https://ticketh.xyz/api/v1/')
const apiToken = process.env.PRETIX_API_TOKEN
const organizerName = process.env.PRETIX_ORGANIZER || 'devcon'
const eventName = process.env.PRETIX_EVENT || '7'

interface PretixResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

async function fetchEndpoint<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(
      `${baseUrl}organizers/${organizerName}/events/${eventName}/${endpoint}`,
      {
        headers: {
          Authorization: `Token ${apiToken}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`HTTP Error for ${endpoint}: ${response.status} ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error)
    return null
  }
}

async function main() {
  console.log('=== Pretix API Comprehensive Test ===\n')
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Organizer: ${organizerName}`)
  console.log(`Event: ${eventName}\n`)

  if (!apiToken) {
    console.error('Error: PRETIX_API_TOKEN environment variable is not set')
    process.exit(1)
  }

  // 1. Fetch Event
  console.log('\n' + '='.repeat(60))
  console.log('1. EVENT INFO')
  console.log('='.repeat(60))
  const event = await fetchEndpoint<any>('')
  if (event) {
    console.log(`Name: ${JSON.stringify(event.name)}`)
    console.log(`Slug: ${event.slug}`)
    console.log(`Currency: ${event.currency}`)
    console.log(`Date from: ${event.date_from}`)
    console.log(`Date to: ${event.date_to}`)
    console.log(`Location: ${JSON.stringify(event.location)}`)
    console.log(`Live: ${event.live}`)
    console.log(`Testmode: ${event.testmode}`)
  }

  // 2. Fetch Categories
  console.log('\n' + '='.repeat(60))
  console.log('2. CATEGORIES (for grouping items)')
  console.log('='.repeat(60))
  const categories = await fetchEndpoint<PretixResponse<any>>('categories/')
  if (categories?.results) {
    for (const cat of categories.results) {
      console.log(`\n[${cat.id}] ${JSON.stringify(cat.name)}`)
      console.log(`  Is addon category: ${cat.is_addon}`)
    }
  }

  // 3. Fetch Items (Products)
  console.log('\n' + '='.repeat(60))
  console.log('3. ITEMS (Products/Tickets)')
  console.log('='.repeat(60))
  const items = await fetchEndpoint<PretixResponse<any>>('items/')
  if (items?.results) {
    for (const item of items.results) {
      console.log(`\n[${item.id}] ${JSON.stringify(item.name)}`)
      console.log(`  Price: ${item.default_price} ${event?.currency || ''}`)
      console.log(`  Active: ${item.active}`)
      console.log(`  Category: ${item.category}`)
      console.log(`  Admission ticket: ${item.admission}`)
      console.log(`  Available from: ${item.available_from}`)
      console.log(`  Available until: ${item.available_until}`)

      if (item.addons && item.addons.length > 0) {
        console.log(`  Addon categories: ${item.addons.map((a: any) => a.addon_category).join(', ')}`)
      }

      if (item.variations && item.variations.length > 0) {
        console.log(`  Variations:`)
        for (const v of item.variations) {
          const price = v.default_price ? `${v.default_price}` : 'same'
          console.log(`    - [${v.id}] ${JSON.stringify(v.value)} (${price})`)
        }
      }
    }
  }

  // 4. Fetch Questions
  console.log('\n' + '='.repeat(60))
  console.log('4. QUESTIONS (Attendee info fields)')
  console.log('='.repeat(60))
  const questions = await fetchEndpoint<PretixResponse<any>>('questions/')
  if (questions?.results) {
    for (const q of questions.results) {
      console.log(`\n[${q.id}] ${JSON.stringify(q.question)}`)
      console.log(`  Type: ${q.type}`)
      console.log(`  Required: ${q.required}`)
      console.log(`  Applies to items: ${q.items?.join(', ') || 'all'}`)

      if (q.options && q.options.length > 0) {
        console.log(`  Options:`)
        for (const opt of q.options) {
          console.log(`    - [${opt.id}] ${JSON.stringify(opt.answer)}`)
        }
      }

      if (q.dependency_question) {
        console.log(`  Depends on Q${q.dependency_question}: ${JSON.stringify(q.dependency_values)}`)
      }
    }
  }

  // 5. Fetch Quotas
  console.log('\n' + '='.repeat(60))
  console.log('5. QUOTAS (Availability)')
  console.log('='.repeat(60))
  const quotas = await fetchEndpoint<PretixResponse<any>>('quotas/')
  if (quotas?.results) {
    for (const quota of quotas.results) {
      console.log(`\n[${quota.id}] ${quota.name}`)
      console.log(`  Size: ${quota.size}`)
      console.log(`  Items: ${quota.items.join(', ')}`)

      // Fetch availability
      const avail = await fetchEndpoint<any>(`quotas/${quota.id}/availability/`)
      if (avail) {
        console.log(`  Available: ${avail.available} (${avail.available_number} remaining)`)
        console.log(`  Paid orders: ${avail.paid_orders}`)
        console.log(`  Pending orders: ${avail.pending_orders}`)
      }
    }
  }

  // Summary for x402 API implementation
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY FOR x402 API IMPLEMENTATION')
  console.log('='.repeat(60))

  if (items?.results) {
    const mainTickets = items.results.filter((i: any) => i.admission && i.active)
    const addons = items.results.filter((i: any) => !i.admission && i.active)

    console.log(`\nMain Tickets (admission=true): ${mainTickets.length}`)
    for (const t of mainTickets) {
      console.log(`  - [${t.id}] ${JSON.stringify(t.name)}: ${t.default_price}`)
    }

    console.log(`\nAddons (admission=false): ${addons.length}`)
    for (const a of addons) {
      console.log(`  - [${a.id}] ${JSON.stringify(a.name)}: ${a.default_price}`)
    }
  }

  if (questions?.results) {
    const required = questions.results.filter((q: any) => q.required)
    console.log(`\nRequired questions: ${required.length}`)
    for (const q of required) {
      console.log(`  - [${q.id}] ${JSON.stringify(q.question)} (${q.type})`)
    }
  }
}

main()
