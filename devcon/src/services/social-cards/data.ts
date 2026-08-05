import dayjs from 'dayjs'
import { socialAssetDataUrl } from './assets'

export function devconApiUrl(): string {
  return process.env.DEVCON_API_URL || 'https://api.devcon.org'
}

export async function getSession(id: string): Promise<any | null> {
  const res = await fetch(`${devconApiUrl()}/sessions/${id}`)
  if (!res.ok) return null
  const { data } = await res.json()
  return data ?? null
}

export async function getAccountSchedule(id: string): Promise<any | null> {
  const res = await fetch(`${devconApiUrl()}/account/${id}/schedule`)
  if (!res.ok) return null
  // This endpoint wraps its payload as { user }, not { data } (verified against
  // the original social-ticket consumer at schedule/u/[id]/opengraph-image.tsx).
  const body = await res.json()
  return body.user ?? body.data ?? null
}

/** Prefetch speaker avatars to data URLs; failures omit the avatar, never fail the render. */
export async function speakerImageDataUrls(session: any): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const speakers: any[] = session?.speakers ?? []
  await Promise.all(
    speakers.map(async s => {
      if (!s?.avatar) return
      try {
        const r = await fetch(s.avatar, { signal: AbortSignal.timeout(4000) })
        if (!r.ok) return
        const buf = Buffer.from(await r.arrayBuffer())
        const mime = r.headers.get('content-type') || 'image/jpeg'
        out.set(s.id, `data:${mime};base64,${buf.toString('base64')}`)
      } catch {
        /* omit avatar */
      }
    })
  )
  return out
}

export function getExpertiseColor(expertise?: string) {
  if (expertise === 'Beginner') return 'bg-[#d2ffd6]'
  if (expertise === 'Intermediate') return 'bg-[#e3dcff]'
  if (expertise === 'Expert') return 'bg-[#f7dbe4]'

  return 'bg-[#d0cbec]'
}

export function getTrackImage(track?: string) {
  if (track === 'Core Protocol') return socialAssetDataUrl('programming/CoreProtocol.png')
  if (track === 'Cypherpunk & Privacy') return socialAssetDataUrl('programming/Cypherpunk.png')
  if (track === 'Usability') return socialAssetDataUrl('programming/Usability.png')
  if (track === 'Real World Ethereum') return socialAssetDataUrl('programming/RealWorldEthereum.png')
  if (track === 'Applied Cryptography') return socialAssetDataUrl('programming/AppliedCryptography.png')
  if (track === 'Cryptoeconomics') return socialAssetDataUrl('programming/CryptoEconomics.png')
  if (track === 'Coordination') return socialAssetDataUrl('programming/Coordination.png')
  if (track === 'Developer Experience') return socialAssetDataUrl('programming/DeveloperExperience.png')
  if (track === 'Security') return socialAssetDataUrl('programming/Security.png')
  if (track === 'Layer 2') return socialAssetDataUrl('programming/Layer2.png')
  if (track === 'Entertainment') return socialAssetDataUrl('programming/Entertainment.png')

  return socialAssetDataUrl('programming/RealWorldEthereum.png')
}

export function getTrackColor(track?: string) {
  if (track === 'Core Protocol') return 'bg-[#F6F2FF]'
  if (track === 'Cypherpunk & Privacy') return 'bg-[#FFF4FF]'
  if (track === 'Usability') return 'bg-[#FFF4F4]'
  if (track === 'Real World Ethereum') return 'bg-[#FFEDDF]'
  if (track === 'Applied Cryptography') return 'bg-[#FFFEF4]'
  if (track === 'Cryptoeconomics') return 'bg-[#F9FFDF]'
  if (track === 'Coordination') return 'bg-[#E9FFD7]'
  if (track === 'Developer Experience') return 'bg-[#E8FDFF]'
  if (track === 'Security') return 'bg-[#E4EEFF]'
  if (track === 'Layer 2') return 'bg-[#F0F1FF]'
  if (track === 'Entertainment') return 'bg-[#FFF0F2]'

  return 'bg-[#FFEDDF]'
}

export function getSpeakerClass(speakers: any[], av?: boolean) {
  const totalLength = speakers.map((i) => i.name).join(', ').length
  if (totalLength >= 60) return 'text-4xl'
  if (totalLength >= 30) return 'text-6xl'

  return 'text-7xl'
}

export function getTitleClass(title: string, av?: boolean, cls?: boolean) {
  if (av) {
    if (title.length > 150)
      return cls ? 'text-6xl leading-normal' : 'text-5xl leading-normal'
    if (title.length > 100)
      return cls ? 'text-7xl leading-tight' : 'text-6xl leading-tight'
    if (title.length > 85)
      return cls ? 'text-7xl leading-normal' : 'text-6xl leading-normal'
    if (title.length > 80)
      return cls ? 'text-8xl leading-snug' : 'text-7xl leading-snug'
    if (title.length > 70)
      return cls ? 'text-8xl leading-normal' : 'text-8xl leading-normal'
    if (title.length > 35) return cls ? 'text-8xl leading-normal' : 'text-8xl'
    if (title.length >= 18)
      return cls ? 'text-9xl leading-normal' : 'text-8xl leading-normal'

    return cls ? 'text-10xl leading-normal' : 'text-9xl leading-normal'
  }

  if (title.length > 150) return 'text-3xl leading-normal'
  if (title.length > 100) return 'text-4xl'
  if (title.length >= 85) return 'text-4xl leading-snug'
  if (title.length >= 80) return 'text-5xl leading-tight'
  if (title.length >= 70) return 'text-5xl leading-snug'
  if (title.length >= 60) return 'text-5xl leading-tight'
  if (title.length >= 35) return 'text-5xl leading-snug'
  if (title.length >= 18) return 'text-6xl leading-snug'
  return 'text-7xl leading-snug'
}

export function getDay(date: string) {
  const day = dayjs(date).format('DD')
  if (day === '12') return 'Day 1'
  if (day === '13') return 'Day 2'
  if (day === '14') return 'Day 3'
  if (day === '15') return 'Day 4'

  return day
}
