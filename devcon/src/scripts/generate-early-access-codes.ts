/**
 * Generate unique early access codes and insert into Supabase
 *
 * Usage:
 *   pnpm run early-access:generate-codes --count 1 [--collection <name>] [--prefix DC8-] [--length 12] [--dry-run]
 */
import 'dotenv/config'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { insertDiscountCodes, getExistingCodes } from '../services/discountStore'
import { TICKETING, TICKETING_ENV } from '../config/ticketing'

const STORE_URL = 'https://devcon.org/en/tickets/store/?early-access='

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, defaultValue: string): string => {
    const idx = args.indexOf(flag)
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue
  }
  return {
    count: parseInt(get('--count', '0'), 10),
    collection: get('--collection', TICKETING.discount.collection),
    prefix: get('--prefix', ''),
    length: parseInt(get('--length', '12'), 10),
    dryRun: args.includes('--dry-run'),
  }
}

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid ambiguity

function generateCode(length: number, prefix: string): string {
  const bytes = crypto.randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARSET[bytes[i] % CHARSET.length]
  }
  return prefix + code
}

async function main() {
  const { count, collection, prefix, length, dryRun } = parseArgs()

  if (count <= 0) {
    console.error('Usage: pnpm run early-access:generate-codes --count <number> [--collection <name>] [--prefix <prefix>] [--length <length>] [--dry-run]')
    console.error(`Default collection from config (${TICKETING_ENV}): ${TICKETING.discount.collection}`)
    console.error('Example: pnpm run early-access:generate-codes --count 100 --collection local-early-bird')
    process.exit(1)
  }

  console.log(`Generating ${count} early access codes (env: ${TICKETING_ENV})`)
  console.log(`  Collection: ${collection}`)
  console.log(`  Prefix: ${prefix || '(none)'}`)
  console.log(`  Code length: ${length} chars (+ prefix)`)
  if (dryRun) console.log('  *** DRY RUN — no changes will be made ***')
  console.log('')

  // Fetch existing codes from DB to avoid collisions
  console.log('Checking for existing codes in DB...')
  const existingCodes = dryRun ? new Set<string>() : await getExistingCodes(collection)
  if (existingCodes.size > 0) console.log(`  Found ${existingCodes.size} existing codes in collection "${collection}"`)

  // Generate unique codes using a Set for deduplication (also excludes DB collisions)
  const codes = new Set<string>()
  let attempts = 0
  const maxAttempts = count * 10
  while (codes.size < count && attempts < maxAttempts) {
    const code = generateCode(length, prefix)
    if (!existingCodes.has(code)) codes.add(code)
    attempts++
  }

  if (codes.size < count) {
    console.error(`Could only generate ${codes.size} unique codes after ${maxAttempts} attempts`)
    process.exit(1)
  }

  const codeArray = Array.from(codes)

  console.log(`Generated ${codeArray.length} unique codes (no DB collisions)`)
  console.log(`  Sample: ${codeArray.slice(0, 5).join(', ')}${codeArray.length > 5 ? ', ...' : ''}`)
  console.log('')

  // Write URLs to text file
  const outDir = path.resolve('generated-codes')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `early-access-codes-${collection}-${timestamp}.txt`
  const outPath = path.join(outDir, filename)
  const lines = codeArray.map(code => `${STORE_URL}${code}`)
  fs.writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`Saved ${codeArray.length} URLs to ${outPath}`)
  console.log('')

  if (dryRun) {
    console.log('*** DRY RUN complete — re-run without --dry-run to insert into Supabase ***')
    return
  }

  console.log('Inserting into Supabase...')
  const inserted = await insertDiscountCodes(codeArray, collection)
  console.log(`Inserted ${inserted} early access codes into collection "${collection}"`)
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
