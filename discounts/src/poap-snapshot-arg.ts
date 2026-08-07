import fs from 'fs'
import path from 'path'

/**
 * Archive snapshot of the Devconnect ARG POAP collection
 * (https://collections.poap.xyz/collections/devconnect-arg/25009), taken
 * because the POAP project (poap.tech / poap.xyz APIs) is shutting down.
 *
 * Writes into inputs/devconnect-arg/ (a subdirectory, so poaps.ts' merge of
 * inputs/POAP_drop_*.csv is unaffected):
 *   drops.json          - drop metadata (name, image_url, dates, mint counts)
 *                         for every ARG drop plus the Devcon & Devconnect
 *                         collection drops (2261)
 *   POAP_drop_<id>.csv  - unique collector addresses per ARG drop
 *   mints/<id>.json     - [{ address, minted_on }] per ARG drop (minted_on is
 *                         what the devconnect-app quest verification used)
 *
 * Drop artwork is NOT downloaded here: the single local copy lives in
 * devconnect-app/public/images/poaps/<dropId>.<ext> (see
 * devconnect-app/scripts/snapshot-poap-assets.ts). media.poap.in also mirrors
 * most artwork at https://media.poap.in/snapshots/2026-07-02-v1/artwork/<id>.webp.
 *
 * Usage:
 *   bun run src/poap-snapshot-arg.ts             # full snapshot
 *   bun run src/poap-snapshot-arg.ts 210366 ...  # only the given drop ids
 */

const GRAPHQL_ENDPOINT = 'https://public.compass.poap.tech/v1/graphql'
const OUTPUT_DIR = 'inputs/devconnect-arg'
const PAGE_SIZE = 100 // Compass caps the page size at 100 regardless of requested limit
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const ARG_COLLECTION_ID = 25009
// In the app's leaderboard drop list but missing from collection 25009.
const EXTRA_ARG_DROP_IDS = [213893]
// Devcon & Devconnect collection (2261). Holder CSVs already exist at
// inputs/POAP_drop_*.csv; included here for metadata + artwork only.
// (191854 devconnect-arg is part of collection 25009.)
const DEVCON_DROP_IDS = [3, 4, 5, 6, 69, 36029, 60695, 165263, 178416]

interface DropMeta {
  id: number
  fancy_id: string
  name: string
  description: string
  image_url: string
  city: string
  country: string
  start_date: string
  end_date: string
  stats_by_chain_aggregate: { aggregate: { sum: { poap_count: number | null; transfer_count: number | null } } }
}

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

async function fetchCollectionDropIds(collectionId: number): Promise<number[]> {
  const data = await compass<{ collections: Array<{ collections_items: Array<{ drop_id: number }> }> }>(
    `query C($id: bigint!) {
      collections(where: { id: { _eq: $id } }) {
        collections_items(limit: 500) { drop_id }
      }
    }`,
    { id: collectionId },
  )
  return data.collections[0].collections_items.map((i) => i.drop_id)
}

async function fetchDropMeta(ids: number[]): Promise<DropMeta[]> {
  const data = await compass<{ drops: DropMeta[] }>(
    `query D($ids: [Int!]!) {
      drops(where: { id: { _in: $ids } }) {
        id fancy_id name description image_url city country start_date end_date
        stats_by_chain_aggregate { aggregate { sum { poap_count transfer_count } } }
      }
    }`,
    { ids },
  )
  return data.drops
}

/** Fetch every mint (collector address + minted_on) for a drop, paginating by id. */
async function fetchMints(dropId: number): Promise<Array<{ address: string; minted_on: number }>> {
  const query = `
    query DropPoaps($dropId: bigint!, $limit: Int!, $offset: Int!) {
      poaps(
        where: { drop_id: { _eq: $dropId } }
        order_by: { id: asc }
        limit: $limit
        offset: $offset
      ) {
        collector_address
        minted_on
      }
    }
  `

  const mints: Array<{ address: string; minted_on: number }> = []
  let offset = 0
  while (true) {
    const data = await compass<{ poaps: Array<{ collector_address: string; minted_on: number }> }>(query, {
      dropId,
      limit: PAGE_SIZE,
      offset,
    })
    for (const { collector_address, minted_on } of data.poaps) {
      const address = collector_address.toLowerCase()
      if (address !== ZERO_ADDRESS) mints.push({ address, minted_on })
    }
    process.stdout.write(`\r  drop ${dropId}: ${mints.length} mints...`)
    if (data.poaps.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    await new Promise((r) => setTimeout(r, 150))
  }
  process.stdout.write('\n')
  return mints
}

async function main() {
  const idFilter = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number)

  const mintsDir = path.join(OUTPUT_DIR, 'mints')
  fs.mkdirSync(mintsDir, { recursive: true })

  console.log(`Fetching collection ${ARG_COLLECTION_ID} drop list...`)
  const collectionDropIds = await fetchCollectionDropIds(ARG_COLLECTION_ID)
  let argDropIds = [...new Set([...collectionDropIds, ...EXTRA_ARG_DROP_IDS])].sort((a, b) => a - b)
  const allDropIds = [...new Set([...argDropIds, ...DEVCON_DROP_IDS])].sort((a, b) => a - b)
  console.log(`  ${collectionDropIds.length} in collection, ${argDropIds.length} ARG drops, ${allDropIds.length} total incl. Devcon collection`)

  console.log('Fetching drop metadata...')
  const drops = (await fetchDropMeta(allDropIds)).sort((a, b) => a.id - b.id)
  const missing = allDropIds.filter((id) => !drops.some((d) => d.id === id))
  if (missing.length) console.warn(`  metadata missing for drops: ${missing.join(', ')}`)
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'drops.json'),
    JSON.stringify(
      {
        snapshot_source: GRAPHQL_ENDPOINT,
        arg_collection_id: ARG_COLLECTION_ID,
        devcon_collection_id: 2261,
        arg_drop_ids: argDropIds,
        drops,
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  )
  console.log(`  wrote ${OUTPUT_DIR}/drops.json (${drops.length} drops)`)

  if (idFilter.length) argDropIds = argDropIds.filter((id) => idFilter.includes(id))

  console.log(`Fetching mints for ${argDropIds.length} ARG drops...`)
  const summary: Array<{ id: number; mints: number; unique: number }> = []
  for (const dropId of argDropIds) {
    const mintsFile = path.join(mintsDir, `${dropId}.json`)
    let mints: Array<{ address: string; minted_on: number }>
    if (fs.existsSync(mintsFile)) {
      mints = JSON.parse(fs.readFileSync(mintsFile, 'utf-8'))
      console.log(`  drop ${dropId}: ${mints.length} mints (cached)`)
    } else {
      mints = await fetchMints(dropId)
      fs.writeFileSync(mintsFile, JSON.stringify(mints, null, 2) + '\n', 'utf-8')
    }
    const unique = [...new Set(mints.map((m) => m.address))]
    fs.writeFileSync(path.join(OUTPUT_DIR, `POAP_drop_${dropId}.csv`), unique.join('\n') + '\n', 'utf-8')
    summary.push({ id: dropId, mints: mints.length, unique: unique.length })
  }

  console.log('\nMints per drop (unique addresses, excluding zero address):')
  let total = 0
  for (const s of summary) {
    total += s.unique
    console.log(`  ${String(s.id).padStart(7)}  ${String(s.mints).padStart(6)} mints  ${String(s.unique).padStart(6)} unique`)
  }
  console.log(`  ${'TOTAL'.padStart(7)}  ${''.padStart(6)}        ${String(total).padStart(6)}`)
}

main().catch((error) => {
  console.error('\nScript failed:', error)
  process.exit(1)
})
