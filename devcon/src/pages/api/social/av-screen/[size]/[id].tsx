import type { NextApiRequest, NextApiResponse } from 'next'
import { poppinsFonts } from 'services/social-cards/assets'
import { renderDc8SocialCard } from 'services/social-cards/dc8-social-card'
import { getSession, getSessionFromPretalx, speakerImageDataUrls } from 'services/social-cards/data'
import { pngToJpeg, serveCachedImage } from 'services/og-cache'

const BUCKET = 'social-cards'

// Native resolutions of the Devcon 8 stage screens (LED walls), from the AV
// production sheet: the intro card at each screen's own size, so the crew
// does not stretch the 16:9 card. Only these sizes render; the size is part
// of the path because the CDN cache key ignores the query string.
const SCREEN_SIZES = new Set(['3192x1512', '4032x1512', '1680x1008', '2016x1176', '1920x1080'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || '')
  const size = String(req.query.size || '')
  if (!id || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) {
    return res.status(400).send({ success: false, error: 'invalid session id' })
  }
  if (!SCREEN_SIZES.has(size)) {
    return res.status(400).send({ success: false, error: `unknown screen size, one of ${[...SCREEN_SIZES].join(', ')}` })
  }
  const [width, height] = size.split('x').map(Number)
  await serveCachedImage({
    res,
    bucket: BUCKET,
    key: `av-screen/${size}/${id}.jpg`,
    render: async () => {
      const session = (await getSession(id)) ?? (await getSessionFromPretalx(id))
      if (!session) throw new Error('session not found')
      if (session.eventId !== 'devcon8') throw new Error('stage screen cards are Devcon 8 only')
      const speakerImages = await speakerImageDataUrls(session)
      const card = renderDc8SocialCard(session, speakerImages, poppinsFonts(), { width, height })
      return pngToJpeg(await card.arrayBuffer(), 85)
    },
  })
}
