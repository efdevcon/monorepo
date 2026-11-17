import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { fetchYoutubeDurations } from '@/services/youtube'

/**
 * Fills `duration` (seconds) for recorded sessions that have a YouTube video
 * but no length yet, from the YouTube Data API. Edits the session files in
 * data/sessions/<event>/ in place, changing only the duration line; commit
 * them to publish (the API loads its data on deploy). New uploads get their
 * length from PUT /sessions/sources/:id, so this is for what came before.
 *
 *   pnpm yt:durations              # devcon8
 *   pnpm yt:durations devcon-7     # any event ids
 */

const SESSIONS_DIR = path.resolve(__dirname, '../../data/sessions')
const DURATION_LINE = /^(\s*"duration":\s*)\d+(?:\.\d+)?/m

async function main() {
  const events = process.argv.slice(2).length ? process.argv.slice(2) : ['devcon8']

  for (const eventId of events) {
    const dir = path.join(SESSIONS_DIR, eventId)
    if (!fs.existsSync(dir)) throw new Error(`No sessions folder for ${eventId}`)

    const missing = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const file = path.join(dir, f)
        const text = fs.readFileSync(file, 'utf8')
        return { file, text, session: JSON.parse(text) }
      })
      .filter(({ session }) => session.sources_youtubeId && !session.duration)
    console.log(`${eventId}: ${missing.length} recorded sessions without a duration`)
    if (!missing.length) continue

    const durations = await fetchYoutubeDurations(missing.map(({ session }) => session.sources_youtubeId))
    let filled = 0
    const unavailable: string[] = []
    for (const { file, text, session } of missing) {
      const seconds = durations.get(session.sources_youtubeId)
      if (!seconds) {
        unavailable.push(session.id)
        continue
      }
      const next = DURATION_LINE.test(text)
        ? text.replace(DURATION_LINE, `$1${seconds}`)
        : JSON.stringify({ ...session, duration: seconds }, null, 2) + '\n'
      fs.writeFileSync(file, next)
      filled++
    }
    console.log(`  filled ${filled}`)
    if (unavailable.length) {
      console.log(`  not readable on YouTube (deleted, private or unlisted to the API): ${unavailable.length}`)
      for (const id of unavailable) console.log(`    ${id}`)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
