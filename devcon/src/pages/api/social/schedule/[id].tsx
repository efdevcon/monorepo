/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextApiRequest, NextApiResponse } from 'next'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import makeBlockie from 'ethereum-blockies-base64'
import { interFonts, poppinsFonts, socialAssetDataUrl } from 'services/social-cards/assets'
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

// ─── Devcon 8 card (Figma: Dev Handoff 5060:6142 frame + 5060:6966 card) ────
// KV scene with a 965×481 session card centered on the 1200×630 canvas. All
// values are exact from the design context; Poppins Regular/Bold.

// The 513px title box spans y152→385 (233px). Buckets keep the clamp inside it:
// 36/1.4 ×4 = 202, 30/1.4 ×5 = 210, 26/1.4 ×6 = 218.
function getDc8TitleStyle(title: string) {
  if (title.length > 170) return { fontSize: 26, lineClamp: 6 }
  if (title.length > 100) return { fontSize: 30, lineClamp: 5 }
  return { fontSize: 36, lineClamp: 4 }
}

function renderDc8Card(
  session: any,
  speakerImages: Map<string, string>,
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer }
) {
  const speakers: any[] = session.speakers ?? []
  // Same crowding rules as the share page: 5+ speakers shrink the stack.
  const many = speakers.length > 4
  const avatarSize = many ? 40 : 56
  const overlap = many ? -8 : -11
  const isCls = !!session.track?.startsWith('[CLS]')
  const title = getDc8TitleStyle(session.title ?? '')

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: 1200, height: 630, position: 'relative', fontFamily: 'Poppins' }}>
        {/* KV art at 1966×1106, centered with an 83px upward bias, dimmed 20% */}
        <img src={socialAssetDataUrl('dc8/kv-bg.jpg')} style={{ position: 'absolute', left: -383, top: -321, width: 1966, height: 1106 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, display: 'flex', background: 'rgba(22, 11, 43, 0.2)' }} />

        {/* Session card: 965×481, radius 32 (design review 2026-08-26), clipped */}
        <div
          style={{
            position: 'absolute',
            left: 117,
            top: 74,
            width: 965,
            height: 481,
            borderRadius: 32,
            overflow: 'hidden',
            display: 'flex',
            backgroundImage: 'linear-gradient(to top, #e5ebff 19.98%, #fbfafc 100%)',
            boxShadow: '0 2px 4px rgba(22,11,43,0.2), 0 4px 8px rgba(22,11,43,0.1), 0 8px 24px rgba(22,11,43,0.2)',
          }}
        >
          {/* Track badge bleeding off the bottom-right corner */}
          {!isCls && (
            <img
              src={getTrackImage(session.track, 'devcon8')}
              style={{ position: 'absolute', left: 604, top: 110, width: 438, height: 444, objectFit: 'contain' }}
            />
          )}

          <img
            src={socialAssetDataUrl('dc8/logo.png')}
            style={{ position: 'absolute', left: 40, top: 40, width: 145, height: 64, objectFit: 'contain' }}
          />

          <div
            style={{
              position: 'absolute',
              right: 40,
              top: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              letterSpacing: -0.5,
            }}
          >
            <span style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.15, color: '#7235ed' }}>MUMBAI, INDIA</span>
            <div style={{ display: 'flex', marginTop: 4, fontSize: 24, lineHeight: 1.15, color: '#594d73' }}>
              <span style={{ color: '#7235ed', marginRight: 6 }}>3—6</span>
              <span>Nov, 2026</span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 40,
              top: 152,
              width: 513,
              display: 'block',
              lineClamp: title.lineClamp,
              fontSize: title.fontSize,
              lineHeight: 1.4,
              letterSpacing: -0.5,
              color: '#1a0d33',
            }}
          >
            {session.title}
          </div>

          {/* Footer: speakers left, format+track pill right */}
          <div
            style={{
              position: 'absolute',
              left: 40,
              top: 385,
              width: 885,
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, marginRight: 24 }}>
              {speakers.map((s: any, index: number) => (
                <img
                  key={s.id}
                  src={speakerImages.get(s.id) || makeBlockie(s.ens || s.name || s.id || 'unknown')}
                  width={avatarSize}
                  height={avatarSize}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: 360,
                    objectFit: 'cover',
                    marginLeft: index > 0 ? overlap : 0,
                    // Multi-speaker frames ring the stack in white; single is
                    // plain (an undefined border value crashes satori's parser).
                    ...(speakers.length > 1 ? { border: '1px solid #ffffff' } : {}),
                  }}
                />
              ))}
              {speakers.length > 0 && (
                <div
                  style={{
                    display: 'block',
                    lineClamp: 2,
                    marginLeft: 16,
                    maxWidth: 500,
                    fontSize: 24,
                    lineHeight: 1.3,
                    letterSpacing: -0.25,
                    color: '#594d73',
                  }}
                >
                  {speakers.map((s: any) => s.name).join(', ')}
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                padding: '8px 12px 8px 8px',
                borderRadius: 12,
                background: '#e6ebff',
                border: '1px solid rgba(34, 17, 68, 0.1)',
                boxShadow: '0 1px 1.5px rgba(22,11,43,0.1), 0 1px 1px rgba(22,11,43,0.1)',
              }}
            >
              {session.type && (
                <span
                  style={{
                    display: 'flex',
                    padding: 8,
                    borderRadius: 4,
                    background: '#7235ed',
                    color: '#ffffff',
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {session.type.toUpperCase()}
                </span>
              )}
              {session.track && (
                <span
                  style={{
                    marginLeft: 12,
                    fontSize: 18,
                    lineHeight: 1.3,
                    letterSpacing: -0.25,
                    color: '#160b2b',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isCls ? 'Community-Led Session' : session.track}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Poppins', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Poppins', data: fonts.bold, weight: 700, style: 'normal' },
      ],
    }
  )
}

// ─── Devcon 7 / SEA card (unchanged) ─────────────────────────────────────────
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
      const card =
        session.eventId === 'devcon8'
          ? renderDc8Card(session, speakerImages, poppinsFonts())
          : renderScheduleCard(session, speakerImages, interFonts())
      const png = await card.arrayBuffer()
      return pngToJpeg(png)
    },
  })
}
