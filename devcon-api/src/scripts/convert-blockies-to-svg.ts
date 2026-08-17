/**
 * One-shot migration: replace embedded blockie PNG data URLs in speaker data
 * files with the equivalent SVG blockies (~500B vs ~22KB — identical visual,
 * same canonical algorithm and seed, see src/utils/blockies-svg.ts).
 *
 * Before this migration 734/1753 speaker files carried a 22KB PNG (15MB —
 * 71% of the speakers dir), inflating every clone, every build, and every
 * full-speakers API response. Only data URLs are touched: real avatar URLs
 * (https) pass through untouched.
 *
 * Seed matches the sync's generator (clients/pretalx.ts): name || sourceId.
 *
 * Usage: pnpm exec ts-node src/scripts/convert-blockies-to-svg.ts [--dry-run]
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import makeBlockie from '../utils/blockies-svg'

const SPEAKERS_DIR = join(__dirname, '../../data/speakers')
const dryRun = process.argv.includes('--dry-run')

let converted = 0
let skippedReal = 0
let bytesBefore = 0
let bytesAfter = 0

for (const file of readdirSync(SPEAKERS_DIR)) {
  if (!file.endsWith('.json')) continue
  const path = join(SPEAKERS_DIR, file)
  const speaker = JSON.parse(readFileSync(path, 'utf8'))
  const avatar: string | undefined = speaker.avatar

  if (!avatar || !avatar.startsWith('data:image/png;base64')) {
    if (avatar) skippedReal++
    continue
  }

  const seed = speaker.name || speaker.sourceId || speaker.id
  const svg = makeBlockie(seed)
  bytesBefore += avatar.length
  bytesAfter += svg.length
  speaker.avatar = svg
  converted++
  if (!dryRun) writeFileSync(path, JSON.stringify(speaker, null, 2))
}

console.log(`${dryRun ? '[dry-run] ' : ''}converted: ${converted} | real avatars untouched: ${skippedReal}`)
console.log(`blockie bytes: ${(bytesBefore / 1048576).toFixed(1)}MB -> ${(bytesAfter / 1048576).toFixed(2)}MB`)
