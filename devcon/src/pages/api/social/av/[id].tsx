/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextApiRequest, NextApiResponse } from 'next'
import makeBlockie from 'ethereum-blockies-base64'
import { interFonts, poppinsFonts, socialAssetDataUrl } from 'services/social-cards/assets'
import { renderDc8SocialCard } from 'services/social-cards/dc8-social-card'
import {
  getExpertiseColor,
  getSession,
  getSpeakerClass,
  getTrackColor,
  getTrackImage,
  speakerImageDataUrls,
} from 'services/social-cards/data'
import { pngToJpeg, serveCachedImage } from 'services/og-cache'

const BUCKET = 'social-cards'

// DC7 renderer, ported from social-ticket/src/app/av/[id]/opengraph-image.tsx
// (1920x1080, the YouTube-thumbnail renderer). Layout, colors, and the inline
// title/speaker sizing math are a lift, not a redesign - only asset sourcing
// changed. devcon8 sessions render the DC8 card (dc8-social-card.tsx) instead.
function renderAvCard(
  session: any,
  speakerImages: Map<string, string>,
  fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer }
) {
  const speakers: any[] = session.speakers ?? []
  const speakerNames = speakers.map((s: any) => s.name).join(', ')

  return new ImageResponse(
    (
      <div
        tw={`flex flex-row relative justify-between w-full h-full p-20 ${getTrackColor(session.track)}`}
        style={{ fontFamily: 'Inter' }}
      >
        <div tw="flex absolute left-1/2 top-0 bottom-0 right-0">
          <img src={socialAssetDataUrl('dc7/prism.png')} tw="h-full opacity-80" />
        </div>

        <div tw="flex flex-col absolute bottom-20 left-20 w-full">
          <div tw="flex w-full my-12" style={{ borderTop: '4px dashed #cfd4eb' }}>
            &nbsp;
          </div>
          <div tw="flex flex-row">
            {speakers.length === 0 && <span tw="h-44">&nbsp;</span>}
            {speakers.map((s: any, index: number) => (
              <img
                key={s.id}
                src={speakerImages.get(s.id) || makeBlockie(s.ens || s.name || s.id || 'unknown')}
                width={speakers.length > 6 ? 80 : 176}
                height={speakers.length > 6 ? 80 : 176}
                tw={`rounded-full border-4 border-white ${speakers.length > 6 ? 'w-20 h-20' : 'w-44 h-44'}`}
                style={{
                  marginLeft: index > 0 ? '-16px' : '0',
                  objectFit: 'cover',
                }}
              />
            ))}
          </div>
        </div>

        {!session.track?.startsWith('[CLS]') && (
          <div tw="flex absolute bottom-0 right-0">
            <img src={getTrackImage(session.track, session.eventId)} tw="h-[38rem]" />
          </div>
        )}

        <div tw="flex flex-row justify-end items-end absolute bottom-20 right-20">
          {session.track?.startsWith('[CLS]') ? (
            <div tw="flex flex-col items-end">
              <span tw="text-4xl text-[#5B5F84]">Community-Led Sessions</span>
              <span tw="text-4xl max-w-[800px] text-right break-words leading-normal">{session.track}</span>
            </div>
          ) : (
            <div
              tw={`flex flex-row items-center justify-center rounded-xl text-4xl font-medium p-2 border border-2 border-[#cfd4eb] ${getTrackColor(session.track)}`}
            >
              {session.type && (
                <span tw="font-bold text-[#2d3540] rounded-xl px-4 py-2 bg-[#e1cdff]">{session.type?.toUpperCase()}</span>
              )}
              {session.expertise && (
                <span tw={`font-bold text-[#2d3540] rounded-xl px-4 py-2 ml-4 ${getExpertiseColor(session.expertise)}`}>
                  {session.expertise?.toUpperCase()}
                </span>
              )}
              {session.track && <span tw="mx-4">{session.track}</span>}
            </div>
          )}
        </div>

        <div
          tw={`flex flex-col justify-between absolute top-20 left-20 ${
            session.track?.startsWith('[CLS]') ? 'w-full' : 'w-[1320px]'
          }`}
        >
          <img src={socialAssetDataUrl('dc7/logo.png')} tw="w-96 mb-12" />

          <div tw="flex flex-col justify-center h-80 mb-4 overflow-hidden">
            <span
              tw="text-[#36364C] leading-tight font-medium"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: '3',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontSize: session.title.length > 100 ? '82px' : session.title.length > 45 ? '92px' : '102px',
                lineHeight: session.title.length > 100 ? '1.1em' : session.title.length > 45 ? '1.15em' : '1.2em',
                maxHeight: session.title.length > 100 ? '3.3em' : session.title.length > 45 ? '3.45em' : '3.6em',
                textOverflow: 'ellipsis',
              }}
            >
              {session.title}
            </span>
          </div>
          <div tw="flex">
            <span
              tw={`text-[#5B5F84] font-medium mt-4 ${getSpeakerClass(speakers, true)}`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontSize: speakerNames.length > 80 ? '40px' : speakerNames.length > 40 ? '56px' : '72px',
                lineHeight: '1.2em',
                maxHeight: '2.4em',
                textOverflow: 'ellipsis',
              }}
            >
              {speakerNames}
            </span>
          </div>
        </div>

        <div tw="flex flex-col justify-between absolute top-20 right-20">
          <div tw="flex flex-col text-4xl justify-end items-end">
            <span tw="font-bold uppercase text-[#5B5F84]">Bangkok, Thailand</span>
            <span tw="mt-2">
              <span tw="text-[#6B54AB] mr-4">12 — 15</span>Nov, 2024
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1920,
      height: 1080,
      fonts: [
        { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Inter', data: fonts.medium, weight: 500, style: 'normal' },
        { name: 'Inter', data: fonts.bold, weight: 700, style: 'normal' },
      ],
    }
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || '')
  if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
    return res.status(400).send({ success: false, error: 'invalid session id' })
  }
  await serveCachedImage({
    res,
    bucket: BUCKET,
    key: `av/${id}.jpg`,
    render: async () => {
      const session = await getSession(id)
      if (!session) throw new Error('session not found')
      const speakerImages = await speakerImageDataUrls(session)
      // Quality 85: this render is the source for YouTube thumbnails.
      const card =
        session.eventId === 'devcon8'
          ? renderDc8SocialCard(session, speakerImages, poppinsFonts(), { width: 1920, height: 1080 })
          : renderAvCard(session, speakerImages, interFonts())
      const png = await card.arrayBuffer()
      return pngToJpeg(png, 85)
    },
  })
}
