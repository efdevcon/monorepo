import type { StaticImageData } from 'next/image'
import { TRACK_IMAGES } from 'components/common/tracks/track-images'

export interface SpeakerTrackTheme {
  /** Canonical DC8 track name ("&" form, matches the event-app). */
  name: string
  /** Pastel tag background — same values as event-app's trackTheme.ts. */
  color: string
  /** Track gem artwork shared with the home TracksSection. */
  image: StaticImageData
}

// Keyed by normalized name; TRACK_IMAGES is index-matched to the
// speaker_applications.tracks.items order (see track-images.ts).
const THEMES: Record<string, SpeakerTrackTheme> = {
  'core protocol': { name: 'Core Protocol', color: '#f3cafd', image: TRACK_IMAGES[0] },
  'privacy & consent': { name: 'Privacy & Consent', color: '#f2f1f4', image: TRACK_IMAGES[1] },
  security: { name: 'Security', color: '#e9cba1', image: TRACK_IMAGES[2] },
  'futures worth building': { name: 'Futures Worth Building', color: '#fff3ac', image: TRACK_IMAGES[3] },
  'rights, freedoms & governance': { name: 'Rights, Freedoms & Governance', color: '#e9e5f6', image: TRACK_IMAGES[4] },
  'permissionless networks': { name: 'Permissionless Networks', color: '#dde3fe', image: TRACK_IMAGES[5] },
  'users, builders & agents': { name: 'Users, Builders & Agents', color: '#ffdfe0', image: TRACK_IMAGES[6] },
  'applied cryptography': { name: 'Applied Cryptography', color: '#e7f0f9', image: TRACK_IMAGES[7] },
  'open & verifiable stack': { name: 'Open & Verifiable Stack', color: '#b4fff1', image: TRACK_IMAGES[8] },
}

// Pretalx says "Rights, Freedoms, and Governance"; fold "A, B, and C" /
// "A, B & C" onto one key (same normalisation as event-app's trackTheme.ts).
const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s*,?\s+and\s+/g, ' & ')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()

export const speakerTrackTheme = (track: string | undefined): SpeakerTrackTheme | undefined =>
  track ? THEMES[normalize(track)] : undefined
