// Devcon 8 card branding, keyed by normalized track name because Pretalx and
// the website spell connectives differently ("Users, Builders, and Agents" vs
// "Users, Builders & Agents"). Shared by the satori OG/YouTube cards (as data
// URLs via data.ts) and the session share page (as /social/... public URLs) —
// keep this module free of server-only imports (sharp, fs) so it can ship to
// the client.

// Standardized 570×570 octagon badges (Figma 5058:3624 ff).
export const DC8_TRACK_BADGES: Record<string, string> = {
  'core protocol': 'dc8/tracks/core-protocol-track.png',
  'privacy and consent': 'dc8/tracks/privacy-consent-track.png',
  security: 'dc8/tracks/security-track.png',
  'futures worth building': 'dc8/tracks/futures-worth-track.png',
  'rights freedoms and governance': 'dc8/tracks/rights-freedoms-track.png',
  'permissionless networks': 'dc8/tracks/permissionless-networks-track.png',
  'users builders and agents': 'dc8/tracks/users-builders-track.png',
  'applied cryptography': 'dc8/tracks/advanced-crypto-track.png',
  'open and verifiable stack': 'dc8/tracks/open-verifiable-track.png',
}

// Per-track canvas/pill color for the YT/OG thumbnail cards (Figma
// 5068:1593 ff — one color per track, pill bg always matches the canvas).
export const DC8_TRACK_COLORS: Record<string, string> = {
  'core protocol': '#f4e2f8',
  'privacy and consent': '#e6e3e8',
  security: '#f5e8d6',
  'futures worth building': '#fff9d1',
  'rights freedoms and governance': '#e9e5f6',
  'permissionless networks': '#e6ebff',
  'users builders and agents': '#ffe5e6',
  'applied cryptography': '#e7f0f9',
  'open and verifiable stack': '#dbfff8',
}

export function normalizeTrackName(track: string): string {
  return track
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Unmapped devcon8 tracks (Art&Culture, Invited speaker, Community Hubs)
// get a neutral badge rather than DC7 art.
export function getDc8TrackBadgePath(track?: string): string {
  return (track && DC8_TRACK_BADGES[normalizeTrackName(track)]) || 'dc8/tracks/futures-worth-track.png'
}

// Unmapped tracks return undefined — cards fall back to the default gradient.
export function getDc8TrackColor(track?: string): string | undefined {
  return track ? DC8_TRACK_COLORS[normalizeTrackName(track)] : undefined
}

// Community-Led Sessions get the Devcon 8 India logomark instead of track art
// (Figma 5071:5730).
export const DC8_CLS_BADGE = 'dc8/tracks/cls-logomark.svg'

// White logomark watermark behind the YT/OG thumbnail cards (Figma 5068:1594).
export const DC8_LOGOMARK_WHITE = 'dc8/logomark-white.svg'

// ─── Session type/track display formatting (shared by the share page and the
// satori cards so the conventions stay in lockstep) ──────────────────────────

// Pretalx type names carry scheduling details ("Talk (20\"Talk+5\"Q&A)",
// "Workshop 1h") — keep just the label for display.
export function cleanDc8SessionType(type: string): string {
  return type
    .replace(/\s*\(.*\)\s*$/, '')
    .replace(/\s+\d+\s*(?:h|hrs?|hours?|m|mins?|minutes?)$/i, '')
    .trim()
}

// Community-Led Sessions: Pretalx marks the track "[CLS] - <name>" (DC7 used
// "[CLS] <name>") and the type "CLS - <name> <format>".
export function isDc8ClsTrack(track?: string): boolean {
  return !!track?.startsWith('[CLS]')
}

export function dc8ClsName(track: string): string {
  return track.replace(/^\[CLS\]\s*-?\s*/, '')
}

// Format labels seen across DC7/DC8 Pretalx data, longest first so
// "Lightning Talk" wins over "Talk" in the ends-with match.
const CLS_FORMATS = ['Lightning Talk', 'Mixed Formats', 'Workshop', 'Panel', 'Music', 'Talk']

// Chip label for a CLS session: "CLS – <format>" (en dash, Figma 5071:5814).
export function dc8ClsChipLabel(type: string): string {
  const format = CLS_FORMATS.find(f => type.endsWith(f)) ?? type.split(' ').pop()
  return format ? `CLS – ${format}` : type
}
