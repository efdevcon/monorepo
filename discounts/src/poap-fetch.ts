import fs from 'fs'
import path from 'path'

/**
 * Fetch every collector address for a set of POAP drops and write one file per
 * drop into inputs/ (`POAP_drop_<id>_<slug>.csv`, one address per line).
 *
 * Data comes from the POAP Compass GraphQL API (the same public endpoint the
 * collections.poap.xyz frontend uses). The zero/burn address is excluded and
 * addresses are de-duplicated per drop.
 *
 * Usage:
 *   bun run src/poap-fetch.ts            # fetch all drops below
 *   bun run src/poap-fetch.ts 69 60695   # fetch only the given drop ids
 */

const GRAPHQL_ENDPOINT = 'https://public.compass.poap.tech/v1/graphql'
const OUTPUT_DIR = 'inputs'
const PAGE_SIZE = 100 // Compass caps the page size at 100 regardless of requested limit
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// Devcon 1-7 + Devconnect editions. Slugs match the existing input CSV names.
const DROPS: Array<{ id: number; slug: string }> = [
  { id: 3, slug: 'devcon-1' },
  { id: 4, slug: 'devcon-2' },
  { id: 5, slug: 'devcon-3' },
  { id: 6, slug: 'devcon-4' },
  { id: 69, slug: 'devcon-5' },
  { id: 60695, slug: 'devcon-bogota' },
  { id: 178416, slug: 'devcon-sea' },
  { id: 36029, slug: 'devconnect-ams' },
  { id: 165263, slug: 'devconnect-ist' },
  { id: 191854, slug: 'devconnect-arg' },
]

async function compass<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'content-type': 'application/json',
      'x-api-key': 'frontend',
      'origin': 'https://collections.poap.xyz',
      'referer': 'https://collections.poap.xyz/',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  return json.data as T
}

/** Fetch all unique collector addresses for a drop, paginating by id. */
async function fetchAddresses(dropId: number): Promise<string[]> {
  const query = `
    query DropPoaps($dropId: bigint!, $limit: Int!, $offset: Int!) {
      poaps(
        where: { drop_id: { _eq: $dropId } }
        order_by: { id: asc }
        limit: $limit
        offset: $offset
      ) {
        collector_address
      }
    }
  `

  const addresses = new Set<string>()
  let offset = 0
  while (true) {
    const data = await compass<{ poaps: Array<{ collector_address: string }> }>(query, {
      dropId,
      limit: PAGE_SIZE,
      offset,
    })
    for (const { collector_address } of data.poaps) {
      const address = collector_address.toLowerCase()
      if (address !== ZERO_ADDRESS) addresses.add(address)
    }
    process.stdout.write(`\r  drop ${dropId}: ${addresses.size} addresses...`)
    if (data.poaps.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    await new Promise((r) => setTimeout(r, 150))
  }
  process.stdout.write('\n')
  return [...addresses]
}

async function main() {
  const args = process.argv.slice(2)
  const idFilter = args.filter((a) => /^\d+$/.test(a)).map(Number)
  const drops = idFilter.length ? DROPS.filter((d) => idFilter.includes(d.id)) : DROPS

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const summary: Array<{ id: number; slug: string; count: number }> = []

  for (const drop of drops) {
    const addresses = await fetchAddresses(drop.id)
    const file = path.join(OUTPUT_DIR, `POAP_drop_${drop.id}_${drop.slug}.csv`)
    fs.writeFileSync(file, addresses.join('\n') + '\n', 'utf-8')
    summary.push({ id: drop.id, slug: drop.slug, count: addresses.length })
  }

  console.log('\nAddresses per event (unique, excluding zero address):')
  const width = Math.max(...summary.map((s) => s.slug.length))
  let total = 0
  for (const s of summary) {
    total += s.count
    console.log(`  ${s.slug.padEnd(width)}  ${String(s.id).padStart(7)}  ${String(s.count).padStart(6)}`)
  }
  console.log(`  ${'TOTAL'.padEnd(width)}  ${''.padStart(7)}  ${String(total).padStart(6)}`)
}

main().catch((error) => {
  console.error('\nScript failed:', error)
  process.exit(1)
})
