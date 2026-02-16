/**
 * Setup add-on items in Pretix backend
 *
 * Creates:
 * 1. "Swag" addon category with 2 free items (with size variations)
 * 2. "Premium Add-ons" addon category with 2 paid items ($45 and $55)
 * 3. Links both addon categories to all active admission tickets
 * 4. Creates quotas so all addon items are purchasable
 *
 * Usage:
 *   pnpm run pretix:setup-addons
 *
 * Pass --cleanup to remove previously created addon items first.
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

const headers: Record<string, string> = {
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

async function del(endpoint: string): Promise<boolean> {
  const url = eventUrl(endpoint)
  const res = await fetch(url, { method: 'DELETE', headers })
  return res.ok || res.status === 404
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

async function cleanup() {
  console.log('=== Cleanup: Removing addon categories, items, and quotas ===')
  const catsRes = await get('/categories/')
  const addonCatIds = new Set<number>()
  const deletedItemIds = new Set<number>()

  for (const cat of catsRes.results || []) {
    if (cat.is_addon) {
      addonCatIds.add(cat.id)
      console.log('  Found addon category [' + cat.id + '] ' + JSON.stringify(cat.name))
    }
  }

  if (addonCatIds.size === 0) {
    console.log('  No addon categories found')
    console.log('  Cleanup done\n')
    return
  }

  // Remove items in addon categories
  const itemsRes = await get('/items/')
  for (const item of itemsRes.results || []) {
    if (item.category && addonCatIds.has(item.category)) {
      console.log('    Removing item [' + item.id + '] ' + JSON.stringify(item.name))
      await del('/items/' + item.id + '/')
      deletedItemIds.add(item.id)
    }
  }

  // Remove addon links from tickets using dedicated nested endpoint
  for (const item of itemsRes.results || []) {
    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        if (addonCatIds.has(addon.addon_category) && addon.id) {
          await del('/items/' + item.id + '/addons/' + addon.id + '/')
          console.log('    Unlinked addon [' + addon.id + '] from ticket [' + item.id + ']')
        }
      }
    }
  }

  // Remove quotas referencing deleted items
  const quotasRes = await get('/quotas/')
  for (const quota of quotasRes.results || []) {
    const refsDeletedItem = (quota.items || []).some((id: number) => deletedItemIds.has(id))
    if (refsDeletedItem) {
      console.log('    Removing quota [' + quota.id + '] ' + quota.name)
      await del('/quotas/' + quota.id + '/')
    }
  }

  // Remove addon categories
  for (const catId of addonCatIds) {
    console.log('    Removing category [' + catId + ']')
    await del('/categories/' + catId + '/')
  }

  console.log('  Cleanup done\n')
}

async function main() {
  console.log('Pretix API:', eventUrl('/'))
  console.log('')

  const doCleanup = process.argv.includes('--cleanup')
  if (doCleanup) {
    await cleanup()
  }

  const sizes = ['Male S', 'Male M', 'Male L', 'Male XL', 'Female S', 'Female M', 'Female L']

  // ── Step 1: Create "Swag" addon category (free items) ──
  console.log('=== Step 1: Creating Swag addon category ===')
  const swagCat = await post('/categories/', {
    name: { en: 'Swag' },
    description: { en: 'Free swag items included with your ticket' },
    position: 1,
    is_addon: true,
  })
  console.log('  Created category [' + swagCat.id + '] is_addon=' + swagCat.is_addon)

  // ── Step 2: Create free swag items with size variations ──
  console.log('\n=== Step 2: Creating free swag items ===')

  const swagItem1 = await post('/items/', {
    name: { en: 'Swag item 1' },
    description: { en: 'Official Devcon swag pack including t-shirt' },
    default_price: '0.00',
    category: swagCat.id,
    admission: false,
    active: true,
    tax_rule: null,
    variations: sizes.map((size, i) => ({
      value: { en: size },
      default_price: '0.00',
      active: true,
      position: i,
    })),
  })
  console.log('  Created [' + swagItem1.id + '] ' + JSON.stringify(swagItem1.name))
  const swagItem1VarIds: number[] = (swagItem1.variations || []).map((v: any) => v.id)
  for (const v of swagItem1.variations || []) {
    console.log('    Variation [' + v.id + '] ' + JSON.stringify(v.value))
  }

  const swagItem2 = await post('/items/', {
    name: { en: 'Swag item 2' },
    description: { en: 'Devcon accessories pack' },
    default_price: '0.00',
    category: swagCat.id,
    admission: false,
    active: true,
    tax_rule: null,
  })
  console.log('  Created [' + swagItem2.id + '] ' + JSON.stringify(swagItem2.name))

  // ── Step 3: Create "Premium Add-ons" addon category (paid items) ──
  console.log('\n=== Step 3: Creating Premium Add-ons category ===')
  const premiumCat = await post('/categories/', {
    name: { en: 'Premium Add-ons' },
    description: { en: 'Premium items available for purchase' },
    position: 2,
    is_addon: true,
  })
  console.log('  Created category [' + premiumCat.id + '] is_addon=' + premiumCat.is_addon)

  // ── Step 4: Create premium items ──
  console.log('\n=== Step 4: Creating premium items ===')

  const premiumItem1 = await post('/items/', {
    name: { en: 'Premium Swag item 1' },
    description: { en: 'Limited edition Devcon premium collectible' },
    default_price: '45.00',
    category: premiumCat.id,
    admission: false,
    active: true,
    tax_rule: null,
  })
  console.log('  Created [' + premiumItem1.id + '] ' + JSON.stringify(premiumItem1.name) + ' price=$45.00')

  const premiumItem2 = await post('/items/', {
    name: { en: 'Premium Swag item 2' },
    description: { en: 'Exclusive Devcon premium bundle' },
    default_price: '55.00',
    category: premiumCat.id,
    admission: false,
    active: true,
    tax_rule: null,
  })
  console.log('  Created [' + premiumItem2.id + '] ' + JSON.stringify(premiumItem2.name) + ' price=$55.00')

  // ── Step 5: Link addon categories to active admission tickets ──
  console.log('\n=== Step 5: Linking addon categories to admission tickets ===')
  const itemsRes = await get('/items/')
  const items = itemsRes.results || []

  for (const item of items) {
    if (item.admission && item.active) {
      const existingAddons: any[] = item.addons || []

      // Link Swag category (free, max 2 items)
      if (!existingAddons.some((a: any) => a.addon_category === swagCat.id)) {
        await post('/items/' + item.id + '/addons/', {
          addon_category: swagCat.id,
          min_count: 0,
          max_count: 2,
          position: existingAddons.length,
          price_included: true,
          multi_allowed: false,
        })
        console.log('  [' + item.id + '] ' + JSON.stringify(item.name) + ' — linked Swag (max 2)')
      }

      // Link Premium Add-ons category (paid, max 5 items, multi allowed)
      if (!existingAddons.some((a: any) => a.addon_category === premiumCat.id)) {
        await post('/items/' + item.id + '/addons/', {
          addon_category: premiumCat.id,
          min_count: 0,
          max_count: 5,
          position: existingAddons.length + 1,
          price_included: false,
          multi_allowed: true,
        })
        console.log('  [' + item.id + '] ' + JSON.stringify(item.name) + ' — linked Premium Add-ons (max 5)')
      }
    }
  }

  // ── Step 6: Create quotas for addon items ──
  console.log('\n=== Step 6: Creating quotas ===')

  const swagQuota = await post('/quotas/', {
    name: 'Swag availability',
    size: 10000,
    items: [swagItem1.id, swagItem2.id],
    variations: [...swagItem1VarIds],
    subevent: null,
  })
  console.log('  Created quota [' + swagQuota.id + '] for Swag items, size=' + swagQuota.size)

  const premiumQuota = await post('/quotas/', {
    name: 'Premium Add-ons availability',
    size: 10000,
    items: [premiumItem1.id, premiumItem2.id],
    variations: [],
    subevent: null,
  })
  console.log('  Created quota [' + premiumQuota.id + '] for Premium items, size=' + premiumQuota.size)

  // ── Verification ──
  console.log('\n=== Verification ===')
  const verifyItems = await get('/items/')
  for (const item of verifyItems.results) {
    if (item.admission && item.active) {
      const addonCats = (item.addons || []).map((a: any) => a.addon_category)
      console.log('  Ticket [' + item.id + '] ' + JSON.stringify(item.name) + ' addon_categories=' + JSON.stringify(addonCats))
    }
    if (item.category === swagCat.id || item.category === premiumCat.id) {
      const varNames = (item.variations || []).map((v: any) => JSON.stringify(v.value))
      console.log('  Addon  [' + item.id + '] ' + JSON.stringify(item.name) + ' price=' + item.default_price + (varNames.length > 0 ? ' variations=' + varNames.join(', ') : ''))
    }
  }

  console.log('\n=== Done! ===')
  console.log('  Swag category ID: ' + swagCat.id)
  console.log('    Swag item 1 ID: ' + swagItem1.id + ' (' + sizes.length + ' size variations)')
  console.log('    Swag item 2 ID: ' + swagItem2.id + ' (' + sizes.length + ' size variations)')
  console.log('  Premium Add-ons category ID: ' + premiumCat.id)
  console.log('    Premium Swag item 1 ID: ' + premiumItem1.id + ' ($45.00)')
  console.log('    Premium Swag item 2 ID: ' + premiumItem2.id + ' ($55.00)')
  console.log('  Swag Quota ID: ' + swagQuota.id)
  console.log('  Premium Quota ID: ' + premiumQuota.id)
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
