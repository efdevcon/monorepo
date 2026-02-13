/**
 * Setup add-on items in Pretix backend
 *
 * Creates:
 * 1. A "Swag" addon category (is_addon=true)
 * 2. "Swag Pack" item with size variations (free)
 * 3. "Sticker Pack" item (free)
 * 4. Links the addon category to all active admission tickets
 * 5. Creates a quota so the addon items are purchasable
 *
 * Usage:
 *   pnpm run pretix:setup-addons
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

const headers = {
  Authorization: 'Token ' + token,
  'Content-Type': 'application/json',
}

function eventUrl(endpoint: string): string {
  return baseUrl + 'organizers/' + org + '/events/' + ev + endpoint
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

async function patch(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const url = eventUrl(endpoint)
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('PATCH ' + endpoint + ' failed (' + res.status + '): ' + text)
  }
  return res.json()
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

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('')

  // Step 1: Create Swag addon category
  console.log('=== Step 1: Creating Swag addon category ===')
  const category = await post('/categories/', {
    name: { en: 'Swag' },
    description: { en: 'Free swag items included with your ticket' },
    position: 1,
    is_addon: true,
  })
  console.log('  Created category [' + category.id + '] name=' + JSON.stringify(category.name) + ' is_addon=' + category.is_addon)

  // Step 2: Create "Swag Pack" with size variations
  console.log('\n=== Step 2: Creating Swag Pack (with size variations) ===')
  const swagPack = await post('/items/', {
    name: { en: 'Swag Pack' },
    description: { en: 'Official Devcon swag pack including t-shirt' },
    default_price: '0.00',
    category: category.id,
    admission: false,
    active: true,
    has_variations: true,
    tax_rule: null,
  })
  console.log('  Created item [' + swagPack.id + '] ' + JSON.stringify(swagPack.name))

  // Create size variations
  const sizes = ['Male S', 'Male M', 'Male L', 'Male XL', 'Female S', 'Female M', 'Female L']
  const variationIds: number[] = []
  for (let i = 0; i < sizes.length; i++) {
    const variation = await post('/items/' + swagPack.id + '/variations/', {
      value: { en: sizes[i] },
      default_price: '0.00',
      active: true,
      position: i,
    })
    variationIds.push(variation.id)
    console.log('    Variation [' + variation.id + '] ' + sizes[i])
  }

  // Step 3: Create "Sticker Pack"
  console.log('\n=== Step 3: Creating Sticker Pack ===')
  const stickerPack = await post('/items/', {
    name: { en: 'Sticker Pack' },
    description: { en: 'Devcon sticker collection' },
    default_price: '0.00',
    category: category.id,
    admission: false,
    active: true,
    has_variations: false,
    tax_rule: null,
  })
  console.log('  Created item [' + stickerPack.id + '] ' + JSON.stringify(stickerPack.name))

  // Step 4: Link addon category to active admission tickets
  console.log('\n=== Step 4: Linking addon category to admission tickets ===')
  const itemsRes = await get('/items/')
  const items = itemsRes.results || []

  for (const item of items) {
    if (item.admission && item.active) {
      const existingAddons: any[] = item.addons || []
      // Don't duplicate — skip if already linked
      if (existingAddons.some((a: any) => a.addon_category === category.id)) {
        console.log('  [' + item.id + '] ' + JSON.stringify(item.name) + ' — already linked')
        continue
      }

      const updatedAddons = [
        ...existingAddons,
        {
          addon_category: category.id,
          min_count: 0,
          max_count: 1,
          position: existingAddons.length,
          price_included: true,
          multi_allowed: false,
        },
      ]

      await patch('/items/' + item.id + '/', { addons: updatedAddons })
      console.log('  [' + item.id + '] ' + JSON.stringify(item.name) + ' — linked addon category ' + category.id)
    }
  }

  // Step 5: Create quota for addon items
  console.log('\n=== Step 5: Creating quota for addon items ===')
  const quota = await post('/quotas/', {
    name: 'Swag availability',
    size: 10000,
    items: [swagPack.id, stickerPack.id],
    variations: variationIds,
    subevent: null,
  })
  console.log('  Created quota [' + quota.id + '] size=' + quota.size)

  // Verify
  console.log('\n=== Verification ===')
  const verifyItems = await get('/items/')
  for (const item of verifyItems.results) {
    if (item.admission && item.active) {
      const addonCats = (item.addons || []).map((a: any) => a.addon_category)
      console.log('  [' + item.id + '] ' + JSON.stringify(item.name) + ' addon_categories=' + JSON.stringify(addonCats))
    }
  }

  console.log('\n=== Done! ===')
  console.log('  Addon category ID: ' + category.id)
  console.log('  Swag Pack ID: ' + swagPack.id + ' (with ' + sizes.length + ' size variations)')
  console.log('  Sticker Pack ID: ' + stickerPack.id)
  console.log('  Quota ID: ' + quota.id)
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
