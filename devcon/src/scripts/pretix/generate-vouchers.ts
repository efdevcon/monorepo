/**
 * Generate Pretix vouchers and insert into Supabase
 *
 * Creates vouchers via Pretix API and stores them in the discount_vouchers table.
 *
 * Usage:
 *   pnpm run pretix:generate-vouchers --count 1 --price 0.01 --tag TestLocalEarlyBird --item-id 2 --collection test-local-early-bird [--max-usages 1] [--dry-run]
 *   pnpm run pretix:generate-vouchers --count 500 --price 99 --tag IndiaEarlyBird --item-id 2 --collection india-early-bird [--dry-run] [--max-usages 1]
 */
import 'dotenv/config'
import { insertDiscountVouchers } from '../../services/discountStore'
import { TICKETING, getPretixApiToken } from '../../config/ticketing'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : url + '/'
  if (!normalized.includes('/api/')) {
    normalized = normalized + 'api/v1/'
  }
  return normalized
}

const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
const org = TICKETING.pretix.organizer
const ev = TICKETING.pretix.event
const token = getPretixApiToken()

const headers: Record<string, string> = {
  Authorization: 'Token ' + token,
  'Content-Type': 'application/json',
}

function eventUrl(endpoint: string): string {
  return baseUrl + 'organizers/' + org + '/events/' + ev + endpoint
}

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, defaultValue: string): string => {
    const idx = args.indexOf(flag)
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue
  }
  return {
    count: parseInt(get('--count', '0'), 10),
    price: get('--price', '0.01'),
    tag: get('--tag', 'TestLocalEarlyBird'),
    itemId: parseInt(get('--item-id', '0'), 10),
    collection: get('--collection', ''),
    maxUsages: parseInt(get('--max-usages', '1'), 10),
    dryRun: args.includes('--dry-run'),
  }
}

async function main() {
  const { count, price, tag, itemId, collection, maxUsages, dryRun } = parseArgs()

  if (count <= 0 || itemId <= 0 || !collection) {
    console.error('Usage: pnpm run pretix:generate-vouchers --count <number> --price <price> --tag <tag> --item-id <id> --collection <name> [--max-usages <n>] [--dry-run]')
    console.error('Example: pnpm run pretix:generate-vouchers --count 10 --price 0.01 --tag TestLocalEarlyBird --item-id 2 --collection test-local-early-bird')
    process.exit(1)
  }

  console.log('Pretix API:', eventUrl('/'))
  console.log(`Creating ${count} vouchers`)
  console.log(`  Price: ${price}`)
  console.log(`  Tag: ${tag}`)
  console.log(`  Item ID: ${itemId}`)
  console.log(`  Collection: ${collection}`)
  console.log(`  Max usages: ${maxUsages}`)
  if (dryRun) console.log('  *** DRY RUN — no changes will be made ***')
  console.log('')

  if (dryRun) {
    console.log(`Would create ${count} vouchers via Pretix API and insert into Supabase`)
    console.log('*** DRY RUN complete — re-run without --dry-run to apply ***')
    return
  }

  const created: Array<{ code: string; pretixVoucherId: number; itemId: number; tag: string }> = []

  for (let i = 0; i < count; i++) {
    const body = {
      price_mode: 'set',
      value: price,
      item: itemId,
      tag,
      max_usages: maxUsages,
      block_quota: true,
      comment: `Auto-generated voucher ${i + 1}/${count} for ${tag}`,
    }

    const url = eventUrl('/vouchers/')
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`Failed to create voucher ${i + 1}: ${res.status} ${text}`)
      if (created.length > 0) {
        console.log(`\nPartially created ${created.length} vouchers before failure. Inserting into Supabase...`)
        break
      }
      process.exit(1)
    }

    const result = await res.json()
    created.push({
      code: result.code,
      pretixVoucherId: result.id,
      itemId,
      tag,
    })

    console.log(`  [${i + 1}/${count}] Created voucher ${result.code} (Pretix ID: ${result.id})`)
  }

  if (created.length === 0) {
    console.log('No vouchers created')
    return
  }

  console.log(`\nInserting ${created.length} vouchers into Supabase...`)
  const inserted = await insertDiscountVouchers(created, collection)
  console.log(`Inserted ${inserted} vouchers into collection "${collection}"`)

  console.log('\n=== Summary ===')
  console.log(`  Created: ${created.length} Pretix vouchers`)
  console.log(`  Stored: ${inserted} in Supabase`)
  console.log(`  Sample codes: ${created.slice(0, 3).map(v => v.code).join(', ')}${created.length > 3 ? ', ...' : ''}`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
