// ENSIP-5 service-key records the page knows how to render. The site shows
// whichever of these exist on the name, so adding a social later is only an
// ENS record edit, never a redeploy. Values are usernames per ENSIP-18
// ("void of service-specific formatting"), but full http(s) URLs pass through
// untouched so records like com.youtube can point at a channel/playlist.
interface SocialDef {
  label: string
  build: (value: string) => string
}

const SOCIALS: Record<string, SocialDef> = {
  'com.twitter': { label: 'X', build: v => `https://x.com/${v}` },
  'com.instagram': { label: 'Instagram', build: v => `https://instagram.com/${v}` },
  'com.github': { label: 'GitHub', build: v => `https://github.com/${v}` },
  'com.youtube': { label: 'YouTube', build: v => `https://youtube.com/@${v}` },
  'org.telegram': { label: 'Telegram', build: v => `https://t.me/${v}` },
  'xyz.farcaster': { label: 'Farcaster', build: v => `https://warpcast.com/${v}` },
  email: { label: 'Email', build: v => `mailto:${v}` },
}

export const SOCIAL_KEYS = Object.keys(SOCIALS)

export function socialLabel(key: string): string | null {
  return SOCIALS[key]?.label ?? null
}

export function socialUrl(key: string, value: string): string | null {
  const def = SOCIALS[key]
  const v = value.trim().replace(/^@/, '')
  if (!def || !v) return null
  if (/^https?:\/\//i.test(v)) return v
  return def.build(v)
}
