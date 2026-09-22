import type { StaticImageData } from 'next/image'

export interface ConstellationSpeaker {
  id: string
  name: string
  // Role/job title. Hand-filled in speakers-allowlist.ts — Pretalx has no
  // job-title question, so this is optional and may be missing.
  title?: string
  company: string
  // Solid fallback behind the portrait while it loads.
  color: string
  // Static import so next/image can generate the blur placeholder.
  image: StaticImageData
  // Bare X handle (no @, no URL). The "Follow on X" CTA is hidden when absent.
  xHandle?: string
}

export const speakerSubtitle = (s: ConstellationSpeaker): string => [s.title, s.company].filter(Boolean).join(' · ')

export const speakerAriaLabel = (s: ConstellationSpeaker): string =>
  s.title ? `${s.name}, ${s.title} at ${s.company}` : `${s.name}, ${s.company}`
