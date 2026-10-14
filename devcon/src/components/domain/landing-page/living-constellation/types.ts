import type { StaticImageData } from 'next/image'
import type { SpeakerLogo } from './speaker-logos'

export interface ConstellationSpeaker {
  id: string
  name: string
  // Role/job title. Hand-filled in speakers-allowlist.ts — Pretalx has no
  // job-title question, so this is optional and may be missing.
  title?: string
  company: string
  // Organisation logo (speaker-logos.ts). Shown in place of the company name
  // when present; the name is still read out as the logo's label.
  logo?: SpeakerLogo
  // Static import so next/image can generate the blur placeholder.
  image: StaticImageData
  // Bare X handle (no @, no URL). The "Follow on X" CTA is hidden when absent.
  xHandle?: string
  // Hand-written blurb shown on the focused card (speakers-allowlist.ts).
  bio?: string
  // Pretalx track name of the speaker's first confirmed session (e.g.
  // "Privacy & Consent"). The card's track tag is hidden when absent.
  track?: string
}

// Comma-joined so no English connective is baked in; callers wrap it in a
// translated phrase (home.speakers.card_label).
export const speakerAriaLabel = (s: ConstellationSpeaker): string =>
  [s.name, s.title, s.company].filter(Boolean).join(', ')
