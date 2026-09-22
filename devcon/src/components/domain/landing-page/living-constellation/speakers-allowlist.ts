/**
 * Hand-curated allowlist for the home page "Devcon 8 Speakers" section.
 *
 * THIS FILE IS THE GATE: only speakers we have publicly announced on X
 * (https://x.com/EFDevcon) belong here. Order = display order: the first four
 * land on the desktop inner ring, the rest are split between the middle and
 * outer rings by count (see ringDistribution in LivingConstellationDesktop),
 * and the first 13 are the ones that survive the cap on small phones.
 *
 * Pretalx (Devcon 8 CFP) supplies name, portrait, organization (question 153)
 * and X handle (question 142). `title` is hand-filled because Pretalx has no
 * job-title question. After editing, run `pnpm speakers:pull` to refresh
 * speakers.generated.ts + assets/portraits/, and commit both. Hand-supplied
 * portraits are used as-is unless you pass --normalize-manual.
 *
 * Keep this file free of image imports so the pull script can import it.
 */

interface AllowlistBase {
  /** Role / job title. Hand-filled; the pull script prints the Pretalx bio to help. */
  title?: string
  /** Card background while the portrait loads. */
  color: string
  /** Bare X handle override when the Pretalx answer is missing or wrong. */
  xHandle?: string
  /** URL of the announcement post on X. Provenance only, never rendered. */
  announcedAt?: string
}

export interface PretalxAllowlistEntry extends AllowlistBase {
  /** Pretalx speaker code on cfp.devcon.org/devcon8 — the join key. */
  code: string
  /** Display-name override (e.g. Pretalx name is a handle). */
  name?: string
  /** Organization override for the Pretalx answer. */
  company?: string
  /** Filename in assets/portraits/ to use instead of the Pretalx avatar. */
  portrait?: string
}

export interface ManualAllowlistEntry extends AllowlistBase {
  /** A speaker who is not (yet) in Pretalx. Portrait must exist in assets/portraits/. */
  manual: { id: string; name: string; company: string; portrait: string }
}

export type AllowlistEntry = PretalxAllowlistEntry | ManualAllowlistEntry

export const allowlistId = (entry: AllowlistEntry): string => ('manual' in entry ? entry.manual.id : entry.code)

// Warm-to-cool palette carried over from the past-speakers data; cycle so
// neighbours on a ring differ.
const C = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  orange: '#f97316',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  blue: '#2563eb',
  green: '#22c55e',
  grape: '#7c3aed',
  ocean: '#0891b2',
  crimson: '#e11d48',
} as const

export const SPEAKER_ALLOWLIST: AllowlistEntry[] = [
  // ── Inner ring (always the first four) ───────────────────────────────────
  { code: 'G9LYGU', title: 'Researcher', xHandle: 'drakefjustin', color: C.indigo }, // Justin Drake · Ethereum Foundation
  { code: 'W8UUCW', title: 'Co-Founder', color: C.fuchsia }, // Roger Dingledine · The Tor Project
  { code: 'MWSEWZ', title: 'Founder', color: C.grape }, // Sandeep Nailwal · Polygon Labs
  { code: 'FZ8PA3', title: 'CTO', company: 'LF Decentralized Trust', color: C.violet }, // Hart Montgomery
  // ── Middle → outer rings (split derived from the count) ──────────────────
  { code: '8FL8QW', title: 'Co-Founder', company: 'Aztec', color: C.orange }, // Zachary Williamson
  { code: 'RMPP9E', title: 'Co-Founder', color: C.cyan }, // Barnabé Monnot · Ethlabs
  { code: '7BLNXR', title: 'Founder', company: 'Giveth', color: C.green }, // Griff Green — TODO confirm title
  // Not in the DC8 Pretalx CFP — portrait supplied by hand (normalised once via --normalize-manual).
  {
    manual: {
      id: 'christopher-fabian',
      name: 'Christopher Fabian',
      company: 'Giga',
      portrait: 'christopher-fabian.webp',
    },
    title: 'Co-Founder',
    xHandle: 'chrisfabian',
    color: C.blue,
  },
  {
    code: 'ZDA7LS',
    title: 'Lawyer & Digital-Rights Researcher',
    company: 'EF Silviculture Society',
    xHandle: 'Fatalmeh',
    color: C.rose,
  }, // Fatemeh Fannizadeh
  { code: '3JEDML', title: 'Protocol Engineering Lead', color: C.teal }, // Dorde Mijovic · Monad Foundation
  { code: 'LP7S9M', title: 'Product & Project Manager', company: 'UNICEF Office of Innovation', color: C.pink }, // Kati Illes
  { code: '3QYPGS', title: 'Researcher & Engineer', color: C.blue }, // Preston Vander Vos · Circle
  { code: 'T8KAJP', title: 'Co-Founder', color: C.ocean }, // Jan Kalivoda · ack3
  { code: 'MPDBM3', title: 'Strategy & Operations Lead', color: C.purple }, // Johanna Moran · libp2p
  { code: 'J7URYL', color: C.crimson }, // Janmajaya Mall · phantom.zone — TODO title
  { code: 'TKDN87', title: 'Integration Engineer', color: C.indigo }, // Jason Chaskin · Ethereum Foundation
  { code: 'GVKNCK', color: C.orange }, // Meinhard Benn · Freedom Browser — TODO title
  { code: 'DURU3V', name: 'Santiago', title: 'Developer Relations', color: C.green }, // SantiagoDevRel · Golem Network
  // Pretalx name is lowercase and the org answer is a paragraph, hence both overrides.
  {
    code: 'B9V8HC',
    name: 'Victoria Kozlova',
    title: 'PhD Researcher',
    company: 'Tallinn University of Technology',
    color: C.fuchsia,
  },
]
