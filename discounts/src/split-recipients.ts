import fs from 'fs'
import path from 'path'

/**
 * Extract all recipient addresses from a 0xSplits v2 split contract and export
 * them as a JSON array.
 *
 * 0xSplits stores only a hash of the split config on-chain, so recipients can't
 * be read with a plain `call`. Instead we read the split's `SplitUpdated` event
 * (emitted whenever the recipient set changes) via the Blockscout API and take
 * the most recent one, which reflects the current recipients.
 *
 * Defaults to the Protocol Guild split on Ethereum mainnet.
 *
 * Usage:
 *   bun run src/split-recipients.ts
 *   bun run src/split-recipients.ts <splitAddress> <outputFile>
 *
 * Reference:
 *   https://app.splits.org/accounts/0xd982477216dadd4c258094b071b49d17b6271d66/?chainId=1
 */

const SPLIT_ADDRESS = process.argv[2] ?? '0xd982477216dadd4c258094b071b49d17b6271d66'
const OUTPUT_FILE = process.argv[3] ?? 'inputs/protocol-guild-2026.json'
const BLOCKSCOUT_API = 'https://eth.blockscout.com/api/v2'

interface BlockscoutLog {
  block_number: number
  decoded?: {
    method_call: string
    parameters: Array<{ name: string; type: string; value: unknown }>
  }
}

interface LogsResponse {
  items: BlockscoutLog[]
  next_page_params: Record<string, unknown> | null
}

// The SplitUpdated event payload decodes to a tuple:
// [recipients: address[], allocations: uint256[], totalAllocation, distributionIncentive]
type SplitStruct = [string[], string[], string, number]

/**
 * Page through the split's logs (newest first) and return the recipients from
 * the most recent SplitUpdated event.
 */
async function fetchRecipients(address: string): Promise<string[]> {
  let pageParams: Record<string, unknown> | null = null
  let page = 0

  while (true) {
    const query = pageParams
      ? '?' + new URLSearchParams(pageParams as Record<string, string>).toString()
      : ''
    const url = `${BLOCKSCOUT_API}/addresses/${address}/logs${query}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Blockscout HTTP ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as LogsResponse
    page += 1
    console.log(`  page ${page}: ${data.items.length} logs`)

    const updated = data.items.find((log) =>
      log.decoded?.method_call?.startsWith('SplitUpdated')
    )
    if (updated) {
      const split = updated.decoded!.parameters[0].value as SplitStruct
      const recipients = split[0]
      console.log(`  found SplitUpdated at block ${updated.block_number} (${recipients.length} recipients)`)
      return recipients
    }

    if (!data.next_page_params) {
      throw new Error('No SplitUpdated event found for this split')
    }
    pageParams = data.next_page_params
    await new Promise((r) => setTimeout(r, 200))
  }
}

async function main() {
  console.log(`Fetching recipients for split ${SPLIT_ADDRESS}...`)
  const recipients = await fetchRecipients(SPLIT_ADDRESS)

  // Sanity-check: valid, unique addresses.
  const seen = new Set<string>()
  const unique: string[] = []
  for (const address of recipients) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`Invalid address in recipient set: ${address}`)
    }
    const key = address.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(address)
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(unique, null, 2) + '\n', 'utf-8')
  console.log(`\nWrote ${unique.length} recipients -> ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error('\nScript failed:', error)
  process.exit(1)
})
