// Devcon 8 track badges (same art as the Speak at Devcon page). Keyed by
// normalized name because Pretalx and the website spell connectives
// differently ("Users, Builders, and Agents" vs "Users, Builders & Agents").
// Shared by the satori OG cards (as data URLs via data.ts) and the session
// share page (as /social/... public URLs) — keep this module free of
// server-only imports (sharp, fs) so it can ship to the client.
export const DC8_TRACK_IMAGES: Record<string, string> = {
  'core protocol': 'dc8/tracks/track-core-protocol.png',
  'privacy and consent': 'dc8/tracks/track-privacy-consent.png',
  security: 'dc8/tracks/track-security.png',
  'futures worth building': 'dc8/tracks/track-futures-worth-building.png',
  'rights freedoms and governance': 'dc8/tracks/track-rights-freedoms-governance.png',
  'permissionless networks': 'dc8/tracks/track-permissionless-networks.png',
  'users builders and agents': 'dc8/tracks/track-users-builders-agents.png',
  'applied cryptography': 'dc8/tracks/track-applied-cryptography.png',
  'open and verifiable stack': 'dc8/tracks/track-open-verifiable-stack.png',
}

// Round-2 card redesign (Figma 5058:3624 ff): standardized 570×570 octagon
// badges, currently used by the session share page only. The OG card route
// still renders the DC8_TRACK_IMAGES art above — consolidate when the OG
// redesign lands.
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
export function getDc8TrackImagePath(track?: string): string {
  return (track && DC8_TRACK_IMAGES[normalizeTrackName(track)]) || 'dc8/tracks/track-futures-worth-building.png'
}

export function getDc8TrackBadgePath(track?: string): string {
  return (track && DC8_TRACK_BADGES[normalizeTrackName(track)]) || 'dc8/tracks/futures-worth-track.png'
}

// Community-Led Sessions get the Devcon 8 India logomark instead of track art
// (Figma 5071:5730).
export const DC8_CLS_BADGE = 'dc8/tracks/cls-logomark.svg'
