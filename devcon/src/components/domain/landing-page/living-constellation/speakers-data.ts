import type { ConstellationSpeaker } from './types'
import { SPEAKER_ALLOWLIST, allowlistId } from './speakers-allowlist'
import { PULLED_SPEAKERS } from './speakers.generated'

// Joins the hand-curated allowlist (order, title, colour, overrides) with the
// Pretalx-pulled profile data (name, organization, X handle, portrait). The
// home page is statically generated, so a stale generated file fails the
// build here instead of shipping a hole in the ring.
export const CONSTELLATION_SPEAKERS: ConstellationSpeaker[] = SPEAKER_ALLOWLIST.map(entry => {
  const id = allowlistId(entry)
  const pulled = PULLED_SPEAKERS[id]
  if (!pulled) {
    throw new Error(
      `[living-constellation] "${id}" is in speakers-allowlist.ts but not in speakers.generated.ts — run \`pnpm speakers:pull\``
    )
  }

  const name = 'manual' in entry ? entry.manual.name : entry.name ?? pulled.name
  const company = 'manual' in entry ? entry.manual.company : entry.company ?? pulled.organization
  const xHandle = entry.xHandle ?? pulled.xHandle

  return {
    id,
    name,
    title: entry.title,
    company,
    color: entry.color,
    image: pulled.image,
    ...(xHandle ? { xHandle } : {}),
  }
})
