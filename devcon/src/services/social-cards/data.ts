import dayjs from 'dayjs'
import sharp from 'sharp'
import { socialAssetDataUrl } from './assets'
import { cleanDc8SessionType, DC8_CLS_BADGE, getDc8TrackBadgePath } from './track-images'
import { isPublicSubmissionState } from './submission-state'

export function devconApiUrl(): string {
  return process.env.DEVCON_API_URL || 'https://api.devcon.org'
}

/** `cacheBuster` rides on the request as a query so the API's edge cache (a minute per session) is skipped. */
export async function getSession(id: string, cacheBuster?: string): Promise<any | null> {
  const query = cacheBuster ? `?v=${encodeURIComponent(cacheBuster)}` : ''
  const res = await fetch(`${devconApiUrl()}/sessions/${id}${query}`)
  if (!res.ok) return null
  const { data } = await res.json()
  return data ?? null
}

/**
 * Speaker with every session they appear in (all events, each stamped with
 * `eventId`) — the speaker share card filters that list itself, so one
 * round-trip covers name, avatar, session count, tags and the featured flag.
 */
export async function getSpeaker(id: string): Promise<any | null> {
  const res = await fetch(`${devconApiUrl()}/speakers/${id}`)
  if (!res.ok) return null
  const { data } = await res.json()
  return data ?? null
}

export interface CommunityHubBundle {
  /** Sessions with `speakerIds`, `tags` as [hub name, topic]. */
  sessions: any[]
  /** Hub speakers (name slugs like Pretalx's, so someone on both programmes has one id). */
  speakers: any[]
}

/**
 * The Community Hubs' own programme (devcon-api builds it live from the hubs'
 * sheets). The speaker share card counts a Pretalx speaker's hub sessions
 * too, like the app's speaker list, and renders a hub-only speaker (unknown
 * to /speakers/:id) from the bundle's speaker record. Empty on any failure:
 * a card without the hub sessions beats no card, and the next render after
 * the cache expires tries again.
 */
export async function getCommunityHubBundle(eventId: string): Promise<CommunityHubBundle> {
  const empty: CommunityHubBundle = { sessions: [], speakers: [] }
  try {
    const res = await fetch(`${devconApiUrl()}/events/${eventId}/community-hubs/bundle`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return empty
    const { data } = await res.json()
    return {
      sessions: Array.isArray(data?.sessions) ? data.sessions : [],
      speakers: Array.isArray(data?.speakers) ? data.speakers : [],
    }
  } catch {
    return empty
  }
}

const PRETALX_BASE = process.env.PRETALX_BASE_URL || 'https://cfp.devcon.org/api'
// Events worth asking Pretalx about when the API misses (newest first).
const PRETALX_FALLBACK_EVENTS = ['devcon8']

/**
 * Fallback for sessions devcon-api doesn't know yet: devcon8 CFP talks only
 * reach the API after confirmation plus a sync run, but acceptance-email share
 * pages (and their og:image scrapes) happen before that. Reads the submission
 * straight from Pretalx and maps it into the card's session shape — slots are
 * null until a schedule exists, which the card template renders as the
 * no-slot variant.
 */
export async function getSessionFromPretalx(id: string): Promise<any | null> {
  const key = process.env.PRETALX_API_KEY
  if (!key || !/^[a-zA-Z0-9]{1,20}$/.test(id)) return null
  const name = (v: any) => (typeof v === 'string' ? v : v?.en) ?? ''

  for (const event of PRETALX_FALLBACK_EVENTS) {
    try {
      const res = await fetch(
        `${PRETALX_BASE}/events/${event}/submissions/${id}/?expand=track,submission_type,speakers,slots,slots.room`,
        { headers: { Authorization: `Token ${key}` }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      // Same visibility rule as the share page: no card (and so no title,
      // speakers or track) for a proposal whose page would 404.
      if (!isPublicSubmissionState(data.state)) return null
      const slot = Array.isArray(data.slots) && data.slots.length > 0 ? data.slots[0] : null
      return {
        id,
        sourceId: data.code ?? id,
        eventId: event,
        title: data.title ?? '',
        type: cleanDc8SessionType(name(data.submission_type?.name ?? data.submission_type)),
        track: name(data.track?.name ?? data.track),
        speakers: (data.speakers || []).map((s: any) => ({
          id: s.code,
          name: s.name ?? '',
          // Old uploads still render on the retired hostname; the files were
          // restored onto the live host (2026-08-24).
          avatar: (s.avatar_url ?? s.avatar ?? '').replace(/^https?:\/\/speak\.devcon\.org\//, 'https://cfp.devcon.org/'),
        })),
        slot_start: slot?.start ?? null,
        slot_end: slot?.end ?? null,
        slot_room: slot?.room ? { name: name(slot.room?.name ?? slot.room) } : null,
      }
    } catch {
      /* try the next event */
    }
  }
  return null
}

export async function getAccountSchedule(id: string): Promise<any | null> {
  const res = await fetch(`${devconApiUrl()}/account/${id}/schedule`)
  if (!res.ok) return null
  // This endpoint wraps its payload as { user }, not { data } (verified against
  // the original social-ticket consumer at schedule/u/[id]/opengraph-image.tsx).
  const body = await res.json()
  return body.user ?? body.data ?? null
}

/**
 * Fetch one avatar and normalize it to a square PNG data URL, or null.
 * PNG because satori cannot decode webp, and the mirrored speaker avatars are
 * webp since 2026-08-25 — embedding them raw made every render throw, so
 * cards silently served stale pre-mirror copies forever (found via the 8GH8TR
 * card, 2026-08-26). Resized to card scale while at it: full-resolution PNGs
 * ballooned the satori SVG past libxml2's 10MB cap on multi-speaker cards.
 * data: avatars are generated blockies — skipped so the card template's own
 * makeBlockie fallback draws the identicon.
 *
 * Pretalx keeps uploads as sent (multi-MB phone photos that miss the timeout),
 * so for a Pretalx avatar its own thumbnail is fetched alongside and used
 * when the original does not arrive in time.
 */
export async function avatarDataUrl(url: string | undefined, px: number): Promise<string | null> {
  if (!url || url.startsWith('data:')) return null
  const thumbnail = pretalxAvatarThumbnail(url)
  const original = fetchImage(url)
  const fallback = thumbnail ? fetchImage(thumbnail) : Promise.resolve(null)
  const image = (await original) ?? (await fallback)
  if (!image) return null
  try {
    const png = await sharp(image).resize(px, px, { fit: 'cover' }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null
  }
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) })
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null
  } catch {
    return null
  }
}

/** Pretalx's own resize of an avatar upload (shown on its speaker pages, not in its API), or null. */
function pretalxAvatarThumbnail(url: string): string | null {
  const m = url.match(/^(https:\/\/cfp\.devcon\.org\/media\/avatars\/[^/?#]+?)(\.[a-z0-9]+)$/i)
  return m && !m[1].endsWith('_thumbnail_default') ? `${m[1]}_thumbnail_default${m[2]}` : null
}

/** Prefetch speaker avatars to data URLs; failures omit the avatar, never fail the render. */
export async function speakerImageDataUrls(session: any): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const speakers: any[] = session?.speakers ?? []
  await Promise.all(
    speakers.map(async s => {
      // Session-card avatars render at ≤176px, so 384px covers every card at 2x.
      const url = await avatarDataUrl(s?.avatar, 384)
      if (url) out.set(s.id, url)
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

// DC8 track-name → badge mapping lives in ./track-images (client-safe module,
// also used by the session share page).
export function getTrackImage(track?: string, eventId?: string) {
  if (eventId === 'devcon8') {
    return socialAssetDataUrl(getDc8TrackBadgePath(track) ?? DC8_CLS_BADGE)
  }
  if (track === 'Core Protocol') return socialAssetDataUrl('dc7/tracks/CoreProtocol.png')
  if (track === 'Cypherpunk & Privacy') return socialAssetDataUrl('dc7/tracks/Cypherpunk.png')
  if (track === 'Usability') return socialAssetDataUrl('dc7/tracks/Usability.png')
  if (track === 'Real World Ethereum') return socialAssetDataUrl('dc7/tracks/RealWorldEthereum.png')
  if (track === 'Applied Cryptography') return socialAssetDataUrl('dc7/tracks/AppliedCryptography.png')
  if (track === 'Cryptoeconomics') return socialAssetDataUrl('dc7/tracks/CryptoEconomics.png')
  if (track === 'Coordination') return socialAssetDataUrl('dc7/tracks/Coordination.png')
  if (track === 'Developer Experience') return socialAssetDataUrl('dc7/tracks/DeveloperExperience.png')
  if (track === 'Security') return socialAssetDataUrl('dc7/tracks/Security.png')
  if (track === 'Layer 2') return socialAssetDataUrl('dc7/tracks/Layer2.png')
  if (track === 'Entertainment') return socialAssetDataUrl('dc7/tracks/Entertainment.png')

  return socialAssetDataUrl('dc7/tracks/RealWorldEthereum.png')
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
