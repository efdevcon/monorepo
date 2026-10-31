/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import makeBlockie from 'ethereum-blockies-base64'
import { socialAssetDataUrl } from './assets'
import {
  cleanDc8SessionType,
  dc8ClsChipLabel,
  dc8ClsName,
  DC8_CLS_BADGE,
  DC8_LOGOMARK_WHITE,
  getDc8TrackBadgePath,
  getDc8TrackColor,
  isDc8ClsTrack,
} from './track-images'

/**
 * Devcon 8 Social/YouTube thumbnail card (Figma: Dev Handoff 5068:1593 ff —
 * 27 frames, 9 tracks × 3 title-length variants, all one layout).
 *
 * Authored on a 1200-wide basis and scaled: the OG route renders 1200×630
 * (the Figma canvas), the AV route 1920×1080 (scale 1.6 on a 675-tall base —
 * same 40px margins, header/footer anchored to the edges, description
 * centered, so the taller 16:9 canvas stretches only the middle zone).
 * Stage screens wider than that (LED walls up to ~2.7:1, av-screen route)
 * scale by height on a 675-tall base instead: the extra width goes to the
 * title column, the watermark and badge stay anchored to the right edge.
 *
 * Layout rules from the frames:
 * - solid per-track canvas color; the Format+Track pill bg always matches it
 * - white DC8 logomark watermark at 50% opacity (468×797 @ x611, v-centered)
 * - 380px octagon badge bleeding off the bottom-right (bottom −32)
 * - title + speaker names centered between the header (bottom y104) and the
 *   avatar row regardless of line count
 * - the avatar stack sits above the footer line, not on it: X paints its
 *   twitter:title label over the bottom-left of large-image cards, so the
 *   stack is raised past that band while the Format+Track pill stays at the
 *   bottom-right (short labels never reach it)
 * - CLS sessions use the share card's default design instead: gradient bg,
 *   the colored Devcon glyph, "CLS – <format>" chip + CLS name
 * - trackless and unmapped sessions (ceremonies, Music Stage, Invited
 *   speaker, Art & Culture…) get the same gradient + Devcon glyph, with the
 *   session's own chip/track label (2026-10-22: they used to borrow the
 *   Futures Worth Building octagon)
 * - the white logomark watermark is on every card, gradient ones included
 *   (2026-10-13: it used to be track cards only)
 */
export function renderDc8SocialCard(
  session: any,
  speakerImages: Map<string, string>,
  fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer },
  size: { width: number; height: number },
  // The session's day, time and room in the top-right corner instead of the city and dates
  // (the AV page's "with time and stage" variant).
  options: { showSlot?: boolean } = {}
) {
  let scale = size.width / 1200
  if (size.height / scale < 630) scale = size.height / 675
  const W = size.width / scale // base-unit canvas width (1200, more on wide stage screens)
  const H = size.height / scale // base-unit canvas height (630 OG, 675 YT)
  const s = (n: number) => n * scale

  const isCls = isDc8ClsTrack(session.track)
  const badge = isCls ? undefined : getDc8TrackBadgePath(session.track)
  const trackColor = isCls ? undefined : getDc8TrackColor(session.track)
  const background = trackColor ?? 'linear-gradient(to top, #e5ebff 19.98%, #fbfafc 100%)'
  const pillColor = trackColor ?? '#e6ebff'

  const type = cleanDc8SessionType(session.type ?? '')
  const chipLabel = (isCls ? dc8ClsChipLabel(type) : type).toUpperCase()
  const trackLabel = isCls ? dc8ClsName(session.track) : session.track

  // The 745px column fits ~27 chars/line at the 50px spec size; longer titles
  // step down so the clamp stays inside the centered zone (390px tall @630).
  const slotWhen = options.showSlot ? slotWhenLabel(session.slot_start) : ''
  const slotRoom: string = options.showSlot ? session.slot_room?.name ?? '' : ''

  const title: string = session.title ?? ''
  const titleStyle =
    title.length > 140
      ? { fontSize: s(34), lineClamp: 5 }
      : title.length > 80
      ? { fontSize: s(42), lineClamp: 4 }
      : { fontSize: s(50), lineClamp: 3 }

  const speakers: any[] = session.speakers ?? []
  const speakerNames = speakers.map((sp: any) => sp.name).join(', ')
  // A speaker without a photo gets the blockie the app shows them. Size stays
  // 80px whatever the count; the raised row has the whole card width to
  // itself, so large groups do not need to shrink.
  const avatars = speakerAvatars(speakers, speakerImages)
  // The AV card (1920x1080, 675-tall base) is a video intro frame, not a
  // social preview: no label band to dodge, so the avatars sit on the footer
  // baseline next to the Format+Track pill and get more room (2026-10-13).
  const isAv = H > 640
  const AVATAR = isAv ? 100 : 80
  const avatarSize = s(AVATAR)
  const overlap = s(isAv ? -30 : -24)

  // X's title label covers roughly the bottom 56px of a 630-tall card (label
  // plus its margin). The avatar stack is lifted past it, and the centered
  // title zone ends 16px above the stack so long titles cannot run into it.
  const X_LABEL_BAND = isAv ? 0 : 56
  const AVATAR_BOTTOM = 40 + X_LABEL_BAND
  const COLUMN_BOTTOM = AVATAR_BOTTOM + AVATAR + 16

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: size.width,
          height: size.height,
          position: 'relative',
          fontFamily: 'Poppins',
          background,
          overflow: 'hidden',
        }}
      >
        {/* Watermark, on every card */}
        <img
          src={socialAssetDataUrl(DC8_LOGOMARK_WHITE)}
          style={{
            position: 'absolute',
            left: s(W - 589),
            top: s((H - 797) / 2),
            width: s(468),
            height: s(797),
            opacity: 0.5,
          }}
        />

        {/* Track badge, or the Devcon glyph for CLS and trackless sessions, bleeding off the bottom-right */}
        {badge ? (
          <img
            src={socialAssetDataUrl(badge)}
            style={{ position: 'absolute', left: s(W - 345.5), bottom: s(-32), width: s(380), height: s(380) }}
          />
        ) : (
          <img
            src={socialAssetDataUrl(DC8_CLS_BADGE)}
            style={{ position: 'absolute', right: s(-40), bottom: s(-120), width: s(362), height: s(616) }}
          />
        )}

        {/* Header: logo left, city/date (or the session's day, time and room) right */}
        <img
          src={socialAssetDataUrl('dc8/logo.png')}
          style={{ position: 'absolute', left: s(40), top: s(40), width: s(145), height: s(64), objectFit: 'contain' }}
        />
        <div
          style={{
            position: 'absolute',
            right: s(40),
            top: s(40),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            letterSpacing: s(-0.5),
          }}
        >
          {headerCorner(s, { top: 25, bottom: 26, gap: 4, dash: 6, maxWidth: 400 }, slotWhen, slotRoom)}
        </div>

        {/* Title + speakers, centered between header and footer */}
        <div
          style={{
            position: 'absolute',
            left: s(40),
            top: s(104),
            height: s(H - COLUMN_BOTTOM - 104),
            width: s(745 + W - 1200),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'block',
              lineClamp: titleStyle.lineClamp,
              fontSize: titleStyle.fontSize,
              fontWeight: 400,
              lineHeight: 1.3,
              letterSpacing: s(-1),
              color: '#1a0d33',
            }}
          >
            {title}
          </div>
          {speakerNames && (
            <div
              style={{
                display: 'block',
                lineClamp: 2,
                marginTop: s(32),
                fontSize: s(32),
                lineHeight: 1.3,
                letterSpacing: s(-0.25),
                color: '#594d73',
              }}
            >
              {speakerNames}
            </div>
          )}
        </div>

        {/* Footer: avatar stack left (raised above X's label band), Format+Track pill bottom-right */}
        <div
          style={{
            position: 'absolute',
            left: s(40),
            right: s(40),
            bottom: s(40),
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          {avatars.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: s(AVATAR_BOTTOM - 40) }}>
              {avatars.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  width={avatarSize}
                  height={avatarSize}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: 360,
                    objectFit: 'cover',
                    border: `${Math.max(1, Math.round(s(1)))}px solid #ffffff`,
                    marginLeft: index > 0 ? overlap : 0,
                  }}
                />
              ))}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginLeft: 'auto',
              flexShrink: 0,
              padding: `${s(8)}px ${s(12)}px ${s(8)}px ${s(8)}px`,
              borderRadius: s(12),
              background: pillColor,
              border: `${Math.max(1, Math.round(s(1)))}px solid rgba(34, 17, 68, 0.1)`,
              boxShadow: `0 ${s(1)}px ${s(1.5)}px rgba(22,11,43,0.1), 0 ${s(1)}px ${s(1)}px rgba(22,11,43,0.1)`,
            }}
          >
            {chipLabel && (
              <span
                style={{
                  display: 'flex',
                  padding: s(8),
                  borderRadius: s(4),
                  background: '#7235ed',
                  color: '#ffffff',
                  fontSize: s(20),
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                {chipLabel}
              </span>
            )}
            {trackLabel && (
              <span
                style={{
                  marginLeft: s(12),
                  fontSize: s(20),
                  fontWeight: 500,
                  lineHeight: 1.3,
                  letterSpacing: s(-0.25),
                  color: '#1a0d33',
                  whiteSpace: 'nowrap',
                  // Track names come from Pretalx free text (CLS names run
                  // long); cap the pill so it can never outgrow the canvas.
                  maxWidth: s(520),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {trackLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts: poppins(fonts),
    }
  )
}

/**
 * Each speaker's photo, or for one without a photo the blockie the app shows
 * them (devcon-api's CreateBlockie: same canonical algorithm, seeded with the
 * name, else the speaker code).
 */
function speakerAvatars(speakers: any[], speakerImages: Map<string, string>): string[] {
  return speakers.map((sp: any) => speakerImages.get(sp.id) ?? makeBlockie(sp.name || sp.id || 'unknown'))
}

const poppins = (fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer }) => [
  { name: 'Poppins', data: fonts.regular, weight: 400 as const, style: 'normal' as const },
  { name: 'Poppins', data: fonts.medium, weight: 500 as const, style: 'normal' as const },
  { name: 'Poppins', data: fonts.bold, weight: 700 as const, style: 'normal' as const },
]

/**
 * The header's top-right lines: the session's day + time and room when given,
 * else the event's "MUMBAI, INDIA / 3—6 Nov, 2026". Sizes in base units.
 */
function headerCorner(
  s: (n: number) => number,
  size: { top: number; bottom: number; gap: number; dash: number; maxWidth: number },
  when: string,
  room: string
) {
  const line = {
    lineHeight: 1.15,
    maxWidth: s(size.maxWidth),
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as const
  // A real column wrapper: Satori lays out a fragment's children as a row.
  if (!when && !room)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontSize: s(size.top), fontWeight: 700, lineHeight: 1.15, color: '#7235ed' }}>
          MUMBAI, INDIA
        </span>
        <div
          style={{
            display: 'flex',
            marginTop: s(size.gap),
            fontSize: s(size.bottom),
            lineHeight: 1.15,
            color: '#594d73',
          }}
        >
          <span style={{ color: '#7235ed', marginRight: s(size.dash) }}>3—6</span>
          <span>Nov, 2026</span>
        </div>
      </div>
    )
  // On a light rounded box, like the Format+Track pill; pulled out by its padding so the text keeps the header's edges.
  const padY = size.top * 0.4
  const padX = size.top * 0.6
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        padding: `${s(padY)}px ${s(padX)}px`,
        margin: `${s(-padY)}px ${s(-padX)}px 0 0`,
        borderRadius: s(size.top * 0.5),
        background: 'rgba(255, 255, 255, 0.72)',
        border: `${Math.max(1, Math.round(s(1)))}px solid rgba(34, 17, 68, 0.1)`,
      }}
    >
      {when && <span style={{ ...line, fontSize: s(size.top), fontWeight: 700, color: '#7235ed' }}>{when}</span>}
      {room && (
        <span
          style={{
            ...line,
            marginTop: when ? s(size.gap) : 0,
            fontSize: s(size.bottom),
            fontWeight: 500,
            color: '#594d73',
          }}
        >
          {room}
        </span>
      )}
    </div>
  )
}

/** "TUE 3 NOV · 14:30" in event time, or "" without a slot. */
function slotWhenLabel(start: string | null | undefined): string {
  if (!start) return ''
  const d = new Date(start)
  const part = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', ...o }).format(d)
  return `${part({ weekday: 'short' })} ${part({ day: 'numeric' })} ${part({ month: 'short' })} · ${part({
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })}`.toUpperCase()
}

/**
 * Instagram Story (1080×1920, 9:16) of the same card: same colors, artwork
 * and type, laid out for a phone held upright. Authored at 1080 wide and
 * scaled. Instagram draws its own UI over a story (profile bar on top, reply
 * bar at the bottom), so everything readable sits between STORY_TOP and
 * STORY_BOTTOM; only the decorative badge reaches below.
 *
 * Top to bottom: the logo with the session's day, time and room (the city
 * and dates when it has no slot), then a block centered in what is left:
 * the title (large, stepping down with length), the speakers' names and
 * photos, and the Format+Track pill.
 */
const STORY_TOP = 260
const STORY_BOTTOM = 1580

export function renderDc8StoryCard(
  session: any,
  speakerImages: Map<string, string>,
  fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer },
  size: { width: number; height: number } = { width: 1080, height: 1920 }
) {
  const scale = size.width / 1080
  const s = (n: number) => n * scale
  const M = 80 // side margin

  const isCls = isDc8ClsTrack(session.track)
  const badge = isCls ? undefined : getDc8TrackBadgePath(session.track)
  const trackColor = isCls ? undefined : getDc8TrackColor(session.track)
  const background = trackColor ?? 'linear-gradient(to top, #e5ebff 19.98%, #fbfafc 100%)'
  const pillColor = trackColor ?? '#e6ebff'

  const type = cleanDc8SessionType(session.type ?? '')
  const chipLabel = (isCls ? dc8ClsChipLabel(type) : type).toUpperCase()
  const trackLabel = isCls ? dc8ClsName(session.track) : session.track

  const title: string = session.title ?? ''
  const titleStyle =
    title.length > 140
      ? { fontSize: s(54), lineClamp: 7 }
      : title.length > 80
      ? { fontSize: s(64), lineClamp: 6 }
      : title.length > 40
      ? { fontSize: s(76), lineClamp: 5 }
      : { fontSize: s(88), lineClamp: 4 }

  const speakers: any[] = session.speakers ?? []
  const speakerNames = speakers.map((sp: any) => sp.name).join(', ')
  const avatars = speakerAvatars(speakers, speakerImages)
  // One row across the safe width whatever the count: big for a solo talk, smaller for panels.
  const AVATAR = avatars.length <= 2 ? 150 : avatars.length <= 4 ? 128 : 104
  const when = slotWhenLabel(session.slot_start)
  const room: string = session.slot_room?.name ?? ''
  const border = `${Math.max(1, Math.round(s(2)))}px solid #ffffff`

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: size.width,
          height: size.height,
          position: 'relative',
          fontFamily: 'Poppins',
          background,
          overflow: 'hidden',
        }}
      >
        {/* Watermark, larger and bleeding off the right edge */}
        <img
          src={socialAssetDataUrl(DC8_LOGOMARK_WHITE)}
          style={{ position: 'absolute', left: s(470), top: s(420), width: s(700), height: s(1192), opacity: 0.5 }}
        />

        {/* Track badge, or the Devcon glyph for CLS and trackless sessions, bleeding off the bottom-right */}
        {badge ? (
          <img
            src={socialAssetDataUrl(badge)}
            style={{ position: 'absolute', right: s(-110), bottom: s(-130), width: s(560), height: s(560) }}
          />
        ) : (
          <img
            src={socialAssetDataUrl(DC8_CLS_BADGE)}
            style={{ position: 'absolute', right: s(-70), bottom: s(-260), width: s(440), height: s(749) }}
          />
        )}

        {/* Header below Instagram's profile bar: logo left, the session's day, time and room (else city/date) right */}
        <img
          src={socialAssetDataUrl('dc8/logo.png')}
          style={{
            position: 'absolute',
            left: s(M),
            top: s(STORY_TOP),
            width: s(250),
            height: s(110),
            objectFit: 'contain',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: s(M),
            top: s(STORY_TOP + 6),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            letterSpacing: s(-0.5),
          }}
        >
          {headerCorner(s, { top: 40, bottom: 42, gap: 6, dash: 10, maxWidth: 580 }, when, room)}
        </div>

        {/* Session block, centered between the header and Instagram's reply bar */}
        <div
          style={{
            position: 'absolute',
            left: s(M),
            right: s(M),
            top: s(STORY_TOP + 110 + 60),
            height: s(STORY_BOTTOM - (STORY_TOP + 110 + 60)),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'block',
              lineClamp: titleStyle.lineClamp,
              fontSize: titleStyle.fontSize,
              fontWeight: 500,
              lineHeight: 1.18,
              letterSpacing: s(-1.5),
              color: '#1a0d33',
            }}
          >
            {title}
          </div>

          {/* Names under the title, photos below them: the landscape card's order */}
          {speakerNames && (
            <div
              style={{
                display: 'block',
                lineClamp: 3,
                marginTop: s(40),
                fontSize: s(42),
                lineHeight: 1.3,
                letterSpacing: s(-0.25),
                color: '#594d73',
              }}
            >
              {speakerNames}
            </div>
          )}
          {avatars.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: s(40) }}>
              {avatars.slice(0, 6).map((src, index) => (
                <img
                  key={index}
                  src={src}
                  width={s(AVATAR)}
                  height={s(AVATAR)}
                  style={{
                    width: s(AVATAR),
                    height: s(AVATAR),
                    borderRadius: 999,
                    objectFit: 'cover',
                    border,
                    marginLeft: index > 0 ? s(-AVATAR * 0.25) : 0,
                  }}
                />
              ))}
            </div>
          )}

          {(chipLabel || trackLabel) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: s(56),
                padding: `${s(10)}px ${s(18)}px ${s(10)}px ${s(10)}px`,
                borderRadius: s(16),
                background: pillColor,
                border: `${Math.max(1, Math.round(s(1)))}px solid rgba(34, 17, 68, 0.1)`,
                boxShadow: `0 ${s(1)}px ${s(2)}px rgba(22,11,43,0.1)`,
              }}
            >
              {chipLabel && (
                <span
                  style={{
                    display: 'flex',
                    padding: `${s(8)}px ${s(12)}px`,
                    borderRadius: s(6),
                    background: '#7235ed',
                    color: '#ffffff',
                    fontSize: s(30),
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {chipLabel}
                </span>
              )}
              {trackLabel && (
                <span
                  style={{
                    marginLeft: chipLabel ? s(16) : 0,
                    fontSize: s(30),
                    fontWeight: 500,
                    lineHeight: 1.3,
                    letterSpacing: s(-0.25),
                    color: '#1a0d33',
                    whiteSpace: 'nowrap',
                    maxWidth: s(560),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {trackLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    ),
    { width: size.width, height: size.height, fonts: poppins(fonts) }
  )
}
