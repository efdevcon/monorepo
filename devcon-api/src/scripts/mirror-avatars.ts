// Backfill: mirror every real speaker avatar into the speaker-avatars bucket
// and point the data at the mirrored copy. Idempotent — objects are keyed by
// source URL, so re-runs skip everything already mirrored. Run with
// `pnpm avatars:mirror`; the sync keeps new avatars mirrored from then on.
import 'dotenv/config'
import fs from 'fs'
import { isMirroredAvatar, mirrorAvatar } from '@/services/avatar-mirror'

const CONCURRENCY = 8
const DIR = './data/speakers'

async function main() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'))
  const todo: { path: string; url: string }[] = []
  for (const f of files) {
    const path = `${DIR}/${f}`
    const speaker = JSON.parse(fs.readFileSync(path, 'utf8'))
    const avatar = speaker.avatar
    if (typeof avatar === 'string' && avatar.startsWith('http') && !isMirroredAvatar(avatar)) {
      todo.push({ path, url: avatar })
    }
  }
  console.log(`${todo.length} avatars to mirror (of ${files.length} speakers)`)

  let next = 0
  let done = 0
  let failed = 0
  const worker = async () => {
    while (next < todo.length) {
      const item = todo[next++]
      try {
        const mirrored = await mirrorAvatar(item.url)
        const speaker = JSON.parse(fs.readFileSync(item.path, 'utf8'))
        speaker.avatar = mirrored
        fs.writeFileSync(item.path, JSON.stringify(speaker, null, 2))
        done++
      } catch (error) {
        failed++
        console.warn(`FAILED ${item.url}: ${(error as Error).message}`)
      }
      if ((done + failed) % 50 === 0) console.log(`${done + failed}/${todo.length} (${failed} failed)`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log(`Done: ${done} mirrored, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
