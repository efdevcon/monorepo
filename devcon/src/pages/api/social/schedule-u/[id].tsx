/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextApiRequest, NextApiResponse } from 'next'
import makeBlockie from 'ethereum-blockies-base64'
import { interFonts, socialAssetDataUrl } from 'services/social-cards/assets'
import { getAccountSchedule } from 'services/social-cards/data'
import { pngToJpeg, serveCachedImage } from 'services/og-cache'

const BUCKET = 'social-cards'

// Ported from social-ticket/src/app/schedule/u/[id]/opengraph-image.tsx
// (1200x630 personal-schedule share card). Lift, not redesign; the
// dc8/personalized.png background is the DC7 art copied as a placeholder.
function renderUserScheduleCard(
  user: any,
  avatarSrc: string,
  fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer }
) {
  return new ImageResponse(
    (
      <div
        tw="flex flex-col text-white w-full h-full overflow-hidden"
        style={{
          backgroundImage: `url(${socialAssetDataUrl('dc7/personalized.png')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div tw="flex flex-col justify-center absolute top-32 left-10 h-[200px] max-w-[525px]">
          <p tw="text-6xl" style={{ fontFamily: 'Inter' }}>
            {user.username}
          </p>
        </div>
        <img src={avatarSrc} alt={user.username} tw="rounded-full absolute top-23 right-32" width={225} height={225} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Inter', data: fonts.medium, weight: 500, style: 'normal' },
        { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' },
      ],
    }
  )
}

// The original passes user.avatar (a remote URL) straight to the renderer;
// prefetching it keeps a dead avatar host from failing the whole card.
async function avatarDataUrl(user: any): Promise<string> {
  if (user?.avatar) {
    try {
      const r = await fetch(user.avatar, { signal: AbortSignal.timeout(4000) })
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        const mime = r.headers.get('content-type') || 'image/jpeg'
        return `data:${mime};base64,${buf.toString('base64')}`
      }
    } catch {
      /* fall through to blockie */
    }
  }
  return makeBlockie(user?.username || user?.id || 'unknown')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || '')
  if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
    return res.status(400).send({ success: false, error: 'invalid account id' })
  }
  await serveCachedImage({
    res,
    bucket: BUCKET,
    key: `schedule-u/${id}.jpg`,
    render: async () => {
      const user = await getAccountSchedule(id)
      if (!user) throw new Error('account schedule not found')
      const avatarSrc = await avatarDataUrl(user)
      const png = await renderUserScheduleCard(user, avatarSrc, interFonts()).arrayBuffer()
      return pngToJpeg(png)
    },
  })
}
