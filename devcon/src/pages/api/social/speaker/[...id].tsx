import type { NextApiRequest, NextApiResponse } from 'next'
import { poppinsFonts } from 'services/social-cards/assets'
import { avatarDataUrl, getSpeaker } from 'services/social-cards/data'
import { renderDc8SpeakerCard } from 'services/social-cards/dc8-speaker-card'
import { pngToJpeg, serveCachedImage } from 'services/og-cache'

const BUCKET = 'social-cards'
// The card says "is speaking at Devcon 8 India", so count/tags come from the
// DC8 sessions only (devcon-api event id).
const DC8_EVENT_ID = 'devcon8'
const MAX_TAGS = 3

/**
 * Speaker share card (Figma 5118:6111), consumed as og:image by the event
 * app's /speakers/[id] pages. Catch-all, same shape as /api/social/schedule:
 *   /api/social/speaker/{id}/            — slug = [id]
 *   /api/social/speaker/{id}/{buster}/   — slug = [id, buster]
 * The buster only hands social scrapers a URL they have never fetched; the
 * image is keyed by `id` alone, so a busted URL still hits the same cache.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = req.query.id
  const segments = Array.isArray(slug) ? slug : slug ? [slug] : []
  const id = String(segments[0] || '')
  if (segments.length > 2 || !id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
    return res.status(400).send({ success: false, error: 'invalid speaker id' })
  }

  // Dev-only override so the card can be previewed against older datasets
  // (the event app's local .env points at devcon-7). Never honoured in prod:
  // the cache key ignores it, so a prod override would poison the DC8 card.
  const eventOverride = process.env.NODE_ENV !== 'production' ? req.query.event : undefined
  const eventId = typeof eventOverride === 'string' && eventOverride ? eventOverride : DC8_EVENT_ID

  await serveCachedImage({
    res,
    bucket: BUCKET,
    key: `speaker/${id}.jpg`,
    render: async () => {
      const speaker = await getSpeaker(id)
      if (!speaker) throw new Error('speaker not found')

      const sessions: any[] = (speaker.sessions ?? []).filter((s: any) => s.eventId === eventId)
      // Same derivation as the event app's speaker list: tag union, trimmed,
      // deduped, alphabetical, first three.
      const tags = Array.from(
        new Set(
          sessions.flatMap((s: any) => (s.tags ?? []) as string[]).map(t => t.trim()).filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b))
        .slice(0, MAX_TAGS)

      // 224px avatar at 2x → 512px source.
      const avatar = await avatarDataUrl(speaker.avatar, 512)
      const card = renderDc8SpeakerCard(
        {
          name: speaker.name ?? id,
          avatar,
          featured: sessions.some((s: any) => s.featured === true),
          sessionCount: sessions.length,
          tags,
        },
        poppinsFonts()
      )
      return pngToJpeg(await card.arrayBuffer())
    },
  })
}
