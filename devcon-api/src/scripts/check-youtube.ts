import fs from 'fs'
import path from 'path'

/**
 * Lists sessions whose YouTube video no longer plays (made private or deleted),
 * using YouTube's public oEmbed endpoint, so no API key is needed. The archive
 * lists every session with a sources_youtubeId, so these show a dead player
 * until the id is removed or replaced. Read-only: changes no files. Exits 1 if
 * anything is unavailable.
 *
 *   pnpm yt:check                  # every event
 *   pnpm yt:check devcon-5 devcon-6  # any event ids
 */

const SESSIONS_DIR = path.resolve(__dirname, '../../data/sessions')
const BATCH_SIZE = 20

async function oembedStatus(youtubeId: string): Promise<string | null> {
  const url = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`
  try {
    const res = await fetch(url)
    if (res.ok) return null
    if (res.status === 401 || res.status === 403) return 'private'
    if (res.status === 404) return 'deleted'
    return `HTTP ${res.status}`
  } catch (err) {
    return `error ${err instanceof Error ? err.message : err}`
  }
}

async function main() {
  const events = process.argv.slice(2).length
    ? process.argv.slice(2)
    : fs.readdirSync(SESSIONS_DIR).filter((f) => fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory())

  let checked = 0
  let unavailable = 0
  for (const eventId of events) {
    const dir = path.join(SESSIONS_DIR, eventId)
    if (!fs.existsSync(dir)) throw new Error(`No sessions folder for ${eventId}`)

    const recorded = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ file: path.join(dir, f), session: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }))
      .filter(({ session }) => session.sources_youtubeId)
    if (!recorded.length) continue

    const dead: string[] = []
    for (let i = 0; i < recorded.length; i += BATCH_SIZE) {
      const batch = recorded.slice(i, i + BATCH_SIZE)
      const statuses = await Promise.all(batch.map(({ session }) => oembedStatus(session.sources_youtubeId)))
      batch.forEach(({ file, session }, j) => {
        if (statuses[j]) {
          dead.push(`    ${statuses[j]}  ${session.sources_youtubeId}  ${path.relative(process.cwd(), file)}  "${session.title}"`)
        }
      })
    }
    checked += recorded.length
    unavailable += dead.length
    console.log(`${eventId}: ${recorded.length} with a YouTube id, ${dead.length} unavailable`)
    for (const line of dead) console.log(line)
  }

  console.log(`\n${checked} checked, ${unavailable} unavailable`)
  if (unavailable) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
