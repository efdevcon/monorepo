/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
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
 *
 * Layout rules from the frames:
 * - solid per-track canvas color; the Format+Track pill bg always matches it
 * - white DC8 logomark watermark at 50% opacity (468×797 @ x611, v-centered)
 * - 380px octagon badge bleeding off the bottom-right (bottom −32)
 * - title + speaker names centered between the header (bottom y104) and the
 *   footer (top y494 @630) regardless of line count
 * - CLS sessions use the share card's default design instead: gradient bg,
 *   the colored Devcon glyph, no watermark, "CLS – <format>" chip + CLS name
 * - unmapped tracks (Invited speaker, Art & Culture…) also fall back to the
 *   gradient, keeping the neutral octagon
 */
export function renderDc8SocialCard(
  session: any,
  speakerImages: Map<string, string>,
  fonts: { regular: ArrayBuffer; medium: ArrayBuffer; bold: ArrayBuffer },
  size: { width: number; height: number }
) {
  const scale = size.width / 1200
  const H = size.height / scale // base-unit canvas height (630 OG, 675 YT)
  const s = (n: number) => n * scale

  const isCls = isDc8ClsTrack(session.track)
  const trackColor = isCls ? undefined : getDc8TrackColor(session.track)
  const background = trackColor ?? 'linear-gradient(to top, #e5ebff 19.98%, #fbfafc 100%)'
  const pillColor = trackColor ?? '#e6ebff'

  const type = cleanDc8SessionType(session.type ?? '')
  const chipLabel = (isCls ? dc8ClsChipLabel(type) : type).toUpperCase()
  const trackLabel = isCls ? dc8ClsName(session.track) : session.track

  // The 745px column fits ~27 chars/line at the 50px spec size; longer titles
  // step down so the clamp stays inside the centered zone (390px tall @630).
  const title: string = session.title ?? ''
  const titleStyle =
    title.length > 140
      ? { fontSize: s(34), lineClamp: 5 }
      : title.length > 80
      ? { fontSize: s(42), lineClamp: 4 }
      : { fontSize: s(50), lineClamp: 3 }

  const speakers: any[] = session.speakers ?? []
  const speakerNames = speakers.map((sp: any) => sp.name).join(', ')
  // Same conventions as the share page: avatars without an image collapse out
  // of the stack; 5+ speakers shrink it.
  const avatars = speakers.map((sp: any) => speakerImages.get(sp.id)).filter(Boolean) as string[]
  const many = avatars.length > 4
  const avatarSize = many ? s(56) : s(80)
  const overlap = many ? s(-16) : s(-24)

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
        {/* Watermark (track cards only) */}
        {trackColor && (
          <img
            src={socialAssetDataUrl(DC8_LOGOMARK_WHITE)}
            style={{
              position: 'absolute',
              left: s(611),
              top: s((H - 797) / 2),
              width: s(468),
              height: s(797),
              opacity: 0.5,
            }}
          />
        )}

        {/* Track badge / CLS glyph, bleeding off the bottom-right */}
        {isCls ? (
          <img
            src={socialAssetDataUrl(DC8_CLS_BADGE)}
            style={{ position: 'absolute', right: s(-40), bottom: s(-120), width: s(362), height: s(616) }}
          />
        ) : (
          <img
            src={socialAssetDataUrl(getDc8TrackBadgePath(session.track))}
            style={{ position: 'absolute', left: s(854.5), bottom: s(-32), width: s(380), height: s(380) }}
          />
        )}

        {/* Header: logo left, city/date right */}
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
          <span style={{ fontSize: s(25), fontWeight: 700, lineHeight: 1.15, color: '#7235ed' }}>MUMBAI, INDIA</span>
          <div style={{ display: 'flex', marginTop: s(4), fontSize: s(26), lineHeight: 1.15, color: '#594d73' }}>
            <span style={{ color: '#7235ed', marginRight: s(6) }}>3—6</span>
            <span>Nov, 2026</span>
          </div>
        </div>

        {/* Title + speakers, centered between header and footer */}
        <div
          style={{
            position: 'absolute',
            left: s(40),
            top: s(104),
            height: s(H - 136 - 104),
            width: s(745),
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

        {/* Footer: avatar stack left, Format+Track pill right, bottom-aligned */}
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
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
      fonts: [
        { name: 'Poppins', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Poppins', data: fonts.medium, weight: 500, style: 'normal' },
        { name: 'Poppins', data: fonts.bold, weight: 700, style: 'normal' },
      ],
    }
  )
}
