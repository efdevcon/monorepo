/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextApiRequest, NextApiResponse } from 'next'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import makeBlockie from 'ethereum-blockies-base64'
import { interFonts, socialAssetDataUrl } from 'services/social-cards/assets'
import {
  getDay,
  getExpertiseColor,
  getSession,
  getSessionFromPretalx,
  getTitleClass,
  getTrackColor,
  getTrackImage,
  speakerImageDataUrls,
} from 'services/social-cards/data'
import { pngToJpeg, serveCachedImage } from 'services/og-cache'

dayjs.extend(utc)
dayjs.extend(timezone)

const BUCKET = 'social-cards'

// Ported from social-ticket/src/app/schedule/[id]/opengraph-image.tsx - layout,
// colors, and text logic are a lift, not a redesign. Only asset sourcing
// changed: fonts/images come in as pre-fetched buffers/data URLs instead of
// being fetched by the renderer itself.
function renderScheduleCard(
  session: any,
  speakerImages: Map<string, string>,
  fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer }
) {
  // Scheduled sessions render room + time; unscheduled ones (devcon8 CFP
  // talks served via the Pretalx fallback) render the event/date variant.
  const showSlots = !!(session.slot_start && session.slot_room)
  const speakers: any[] = session.speakers ?? []
  const isDevcon8 = session.eventId === 'devcon8'
  const tz = isDevcon8 ? 'Asia/Kolkata' : 'Asia/Bangkok'
  // DC8 uses one soft periwinkle ground for every track (a step deeper than
  // the DC7 pastels, light enough for the dark text); DC7 keeps its
  // per-track pastels.
  const bgClass = isDevcon8 ? 'bg-[#dfe3fb]' : getTrackColor(session.track)

  return new ImageResponse(
    (
      <div
        tw={`flex flex-row relative justify-between w-full h-full p-12 ${bgClass}`}
        style={{ fontFamily: 'Inter' }}
      >
        <div tw="flex absolute left-1/2 top-0 bottom-0 right-0">
          {/* Per-event background art (currently the same lotus line art for
              both; swap dc8/prism.png when dedicated DC8 art lands — and if
              that art is dense rather than line art, drop the opacity). */}
          <img src={socialAssetDataUrl(isDevcon8 ? 'dc8/prism.png' : 'dc7/prism.png')} tw="h-full opacity-80" />
        </div>

        <div tw="flex flex-col absolute bottom-12 left-12 w-full">
          <div tw="flex w-full my-6" style={{ borderTop: '3px dashed #cfd4eb' }}>
            &nbsp;
          </div>
          <div tw="flex flex-row items-center">
            {speakers.length === 0 && <span tw="h-28">&nbsp;</span>}
            {speakers.map((s: any, index: number) => (
              <img
                key={s.id}
                src={speakerImages.get(s.id) || makeBlockie(s.ens || s.name || s.id || 'unknown')}
                width={speakers.length > 6 ? 64 : 112}
                height={speakers.length > 6 ? 64 : 112}
                tw={`rounded-full border-4 border-white ${speakers.length > 6 ? 'w-16 h-16' : 'w-28 h-28'}`}
                style={{
                  marginLeft: index > 0 ? '-16px' : '0',
                  objectFit: 'cover',
                }}
              />
            ))}
            {/* DC8: names ride next to the avatars so a long (3-line) title
                can't push them into the divider; DC7 keeps names under the
                title (below). Cap width so the row clears the track badge. */}
            {isDevcon8 && speakers.length > 0 && (
              <span tw={`text-[#36364C] font-medium ml-5 max-w-[440px] ${speakers.length > 6 ? 'text-xl' : 'text-2xl'}`}>
                {speakers.map((s: any) => s.name).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* DC8 badges are square (the DC7 art was tall and bled off the card
            by itself) — offset them past the corner so they crop bottom-right
            like the SEA cards did. */}
        {!session.track?.startsWith('[CLS]') && (
          <div tw={`flex absolute ${isDevcon8 ? 'bottom-[-5rem] right-[-4rem]' : 'bottom-0 right-0'}`}>
            <img src={getTrackImage(session.track, session.eventId)} tw="h-[32rem]" />
          </div>
        )}

        <div tw="flex flex-row justify-end items-end absolute bottom-12 right-12">
          {session.track?.startsWith('[CLS]') ? (
            <div tw="flex flex-col items-end">
              <span tw="text-xl text-[#5B5F84]">Community-Led Sessions</span>
              <span tw="text-xl max-w-[440px] text-right break-words">{session.track}</span>
            </div>
          ) : (
            <div
              tw={`flex flex-row items-center justify-center rounded-xl text-xl font-medium p-1 border border-1 border-[#cfd4eb] ${bgClass}`}
            >
              {session.type && (
                <span tw="font-bold text-[#2d3540] rounded-xl px-2 py-1 bg-[#e1cdff]">{session.type?.toUpperCase()}</span>
              )}
              {session.expertise && (
                <span tw={`font-bold text-[#2d3540] rounded-xl px-2 py-1 ml-2 ${getExpertiseColor(session.expertise)}`}>
                  {session.expertise?.toUpperCase()}
                </span>
              )}
              {session.track && <span tw="mx-4">{session.track}</span>}
            </div>
          )}
        </div>

        <div tw="flex flex-col justify-between w-[700px] absolute top-12 left-12">
          {/* The DC8 wordmark is visually lighter than the DC7 lockup — give
              it more width so both logos carry the same weight on the card. */}
          <img src={socialAssetDataUrl(isDevcon8 ? 'dc8/logo.png' : 'dc7/logo.png')} tw={isDevcon8 ? 'w-80 mb-8' : 'w-60 mb-8'} />

          <div tw="flex flex-col justify-center h-48">
            <span tw={`text-[#36364C] leading-[12px] font-medium ${getTitleClass(session.title)}`}>{session.title}</span>
          </div>
          {!isDevcon8 && (
            <div tw="flex">
              <span tw={`text-[#5B5F84] text-2xl font-medium ${speakers.length > 6 ? 'text-xl' : ''}`}>
                {speakers.map((s: any) => s.name).join(', ')}
              </span>
            </div>
          )}
        </div>

        <div tw="flex flex-col justify-between absolute top-12 right-12">
          {showSlots && (
            <div tw="flex flex-row text-2xl justify-end items-end text-[#36364C]">
              <div tw="flex flex-col">
                <span>
                  <span>Room — </span>
                  <span tw="font-bold">
                    {session.slot_room.name} {session.slot_room.description && `(${session.slot_room.description})`}
                  </span>
                </span>
                <span tw="flex justify-end items-end">
                  {session.slot_room.info && (
                    <>
                      <span>Floor — </span>
                      <span tw="font-bold">{session.slot_room.info}</span>
                    </>
                  )}
                </span>
              </div>
              <div tw="flex flex-col items-end ml-12">
                <span>
                  <span>{getDay(session.slot_start)} — </span>
                  <span tw="font-bold">{dayjs(session.slot_start).tz(tz).format('ddd, MMM DD')}</span>
                </span>
                <span tw="font-bold">
                  {dayjs(session.slot_start).tz(tz).format('h:mm a')} -{' '}
                  {dayjs(session.slot_end).tz(tz).format('h:mm a')}
                </span>
              </div>
            </div>
          )}
          {!showSlots && (
            <div tw="flex flex-col text-2xl justify-end items-end">
              <span tw="font-bold uppercase text-[#5B5F84]">{isDevcon8 ? 'Mumbai, India' : 'Bangkok, Thailand'}</span>
              <span>
                <span tw="text-[#6B54AB] mr-2">{isDevcon8 ? '3 — 6' : '12 — 15'}</span>
                {isDevcon8 ? 'Nov, 2026' : 'Nov, 2024'}
              </span>
            </div>
          )}
        </div>
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || '')
  if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
    return res.status(400).send({ success: false, error: 'invalid session id' })
  }
  // ?v= (event version) is a crawler-side cache buster only - ignored here.
  await serveCachedImage({
    res,
    bucket: BUCKET,
    key: `schedule/${id}.jpg`,
    render: async () => {
      // devcon8 CFP talks aren't in the API until confirmed + synced — fall
      // back to reading the submission straight from Pretalx.
      const session = (await getSession(id)) ?? (await getSessionFromPretalx(id))
      if (!session) throw new Error('session not found')
      const speakerImages = await speakerImageDataUrls(session)
      const png = await renderScheduleCard(session, speakerImages, interFonts()).arrayBuffer()
      return pngToJpeg(png)
    },
  })
}
