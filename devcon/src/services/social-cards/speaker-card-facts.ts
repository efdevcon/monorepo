import { isDc8ClsTrack } from './track-images'

/**
 * What the speaker share card says about a speaker, derived from their
 * sessions the way the event app's speaker list derives its card
 * (useSpeakersData): one count across both programmes, the alphabetical
 * union of the sessions' topic tags, and which programme(s) they appear in.
 * Pure, so the derivation can be checked without rendering.
 */

/** The two programmes of the app's Schedule tab (the "Tracks" / "Community" switch). */
export type SpeakerProgramme = 'tracks' | 'community'

export interface SpeakerCardSession {
  track?: string
  tags?: unknown
  featured?: boolean
}

export interface SpeakerCardFacts {
  sessionCount: number
  featured: boolean
  programmes: SpeakerProgramme[]
  /** Every topic tag, trimmed, deduped, alphabetical; the renderer fits what its footer can hold. */
  tags: string[]
}

/**
 * Tags as the API may send them: an array of names, or one comma-joined
 * string (devcon-api's own session type allows both, and the event app's
 * store splits the same way). A card rendered on 2026-10-27 showed each
 * session's whole list as a single chip ("POST-QUANTUM,AI,P2P,…"), so a
 * name that still carries commas is split too.
 */
export function splitTags(raw: unknown): string[] {
  const list = typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : []
  return list
    .flatMap(t => String(t).split(','))
    .map(t => t.trim())
    .filter(Boolean)
}

/**
 * `pretalx` are the speaker's Pretalx sessions for the event; `hubs` their
 * Community Hub sessions (the hubs' own programme, served separately). The
 * programme split follows the app (`data/programme.ts`): a Pretalx session
 * whose track carries the programme team's "[CLS]" marker is community-led,
 * every hub session is community, the rest is the tracks programme.
 */
export function speakerCardFacts(pretalx: SpeakerCardSession[], hubs: SpeakerCardSession[]): SpeakerCardFacts {
  const programmes: SpeakerProgramme[] = []
  if (pretalx.some(s => !isDc8ClsTrack(s.track))) programmes.push('tracks')
  if (hubs.length > 0 || pretalx.some(s => isDc8ClsTrack(s.track))) programmes.push('community')

  const tags = Array.from(new Set([...pretalx, ...hubs].flatMap(s => splitTags(s.tags)))).sort((a, b) =>
    a.localeCompare(b)
  )

  return {
    sessionCount: pretalx.length + hubs.length,
    featured: pretalx.some(s => s.featured === true),
    programmes,
    tags,
  }
}

// ── Fitting tags into a pixel budget ────────────────────────────────────────
// @vercel/og lays out once and clips nothing, so a row of nowrap chips simply
// runs off the card (the 2026-10-27 card). The renderer has no text measurer,
// so chips are sized from a per-glyph estimate of Poppins at the chip's size,
// deliberately on the wide side (measured renders come in ~6% narrower): the
// fit errs on dropping a tag, never on overflowing.

const NARROW_GLYPH = /[IJLijl1 .,:;'!|()\-]/

/** Estimated advance of `text` set in Poppins at `size` px. `em` is the wide glyph's share of the size. */
export function estimateTextWidth(text: string, size: number, em: number): number {
  let width = 0
  for (const ch of text) width += (NARROW_GLYPH.test(ch) ? em * 0.55 : em) * size
  return width
}

/**
 * The tags (in the given order) that fit `budget` px side by side, at most
 * `max`. A tag too wide for what is left is skipped and the next is tried, so
 * one over-long free-text tag costs itself, not every tag after it.
 */
export function fitTags(
  tags: string[],
  budget: number,
  chip: { width: (tag: string) => number; gap: number },
  max = 3
): string[] {
  const out: string[] = []
  let used = 0
  for (const tag of tags) {
    if (out.length >= max) break
    const width = chip.width(tag) + (out.length > 0 ? chip.gap : 0)
    if (used + width > budget) continue
    out.push(tag)
    used += width
  }
  return out
}
