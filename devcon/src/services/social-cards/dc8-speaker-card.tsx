/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import makeBlockie from 'ethereum-blockies-base64'
import { Speech } from 'lucide-react'
import { socialAssetDataUrl, type PoppinsFonts } from './assets'
import { DC8_LOGOMARK_WHITE } from './track-images'

export interface Dc8SpeakerCardInput {
  name: string
  /** PNG data URL (webp already transcoded) or null for the blockie fallback. */
  avatar: string | null
  featured: boolean
  sessionCount: number
  /** Topic tags, already capped by the caller (design shows three). */
  tags: string[]
}

const W = 1200
const H = 630
// Card box (Figma 5118:6530): 1075×576 centred on the 1200×630 canvas.
const CARD_W = 1075
const CARD_H = 576
const CARD_X = (W - CARD_W) / 2
const CARD_Y = (H - CARD_H) / 2

/**
 * Devcon 8 speaker share card (Figma: Dev Handoff 5118:6111
 * "Speaker-Sharing-Image", 1200×630). Unlike the session card this one sits
 * on the Mumbai key visual with a dark overlay, with a floating gradient card
 * (radius 40, hairline, soft shadow) that reuses the session card's header
 * (logo + "MUMBAI, INDIA / 3—6 Nov, 2026") and white logomark watermark.
 *
 * Body: 224px ringed avatar (marigold ring + FEATURED tag for featured
 * speakers, purple-300 ring otherwise — the app's rule) beside the name
 * (52px bold, 2-line clamp) and "is speaking at Devcon 8 India"; footer row
 * with the session count and up to three outlined topic tags.
 */
export function renderDc8SpeakerCard(input: Dc8SpeakerCardInput, fonts: PoppinsFonts) {
  const ringColor = input.featured ? '#ffa366' : '#b08df5'
  const sessionLabel = `${input.sessionCount} ${input.sessionCount === 1 ? 'Session' : 'Sessions'}`

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: W,
          height: H,
          position: 'relative',
          fontFamily: 'Poppins',
          background: '#fff9d1',
          overflow: 'hidden',
        }}
      >
        {/* Mumbai key visual, bled 2px/24px past the canvas, under a 30% ink overlay */}
        <img
          src={socialAssetDataUrl('dc8/kv-bg.jpg')}
          style={{ position: 'absolute', left: -2, top: -24, width: 1204, height: 677, objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(34, 17, 68, 0.3)' }} />

        {/* Floating card */}
        <div
          style={{
            position: 'absolute',
            left: CARD_X,
            top: CARD_Y,
            width: CARD_W,
            height: CARD_H,
            display: 'flex',
            borderRadius: 40,
            border: '1px solid rgba(34, 17, 68, 0.1)',
            background: 'linear-gradient(to top, #e5ebff 19.98%, #fbfafc 100%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Watermark: 468×797 at x723, vertically centred +20.5 */}
          <img
            src={socialAssetDataUrl(DC8_LOGOMARK_WHITE)}
            style={{
              position: 'absolute',
              left: 723,
              top: CARD_H / 2 + 20.5 - 797 / 2,
              width: 468,
              height: 797,
              opacity: 0.5,
            }}
          />

          {/* Header: logo left, city/date right (session-card recipe at this card's scale) */}
          <img
            src={socialAssetDataUrl('dc8/logo.png')}
            style={{ position: 'absolute', left: 40, top: 40, width: 182, height: 80, objectFit: 'contain' }}
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
            <span style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.15, color: '#7235ed' }}>MUMBAI, INDIA</span>
            <div style={{ display: 'flex', marginTop: 4, fontSize: 28, lineHeight: 1.15, color: '#594d73' }}>
              <span style={{ color: '#7235ed', marginRight: 7 }}>3—6</span>
              <span>Nov, 2026</span>
            </div>
          </div>

          {/* Speaker row: ringed avatar + name/subline, vertically centred */}
          <div
            style={{
              position: 'absolute',
              left: 40,
              top: 0,
              height: CARD_H,
              width: CARD_W - 80,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', position: 'relative', width: 224, height: 224, flexShrink: 0 }}>
              <img
                src={input.avatar ?? makeBlockie(input.name || 'unknown')}
                width={224}
                height={224}
                style={{
                  width: 224,
                  height: 224,
                  borderRadius: 360,
                  objectFit: 'cover',
                  border: `4px solid ${ringColor}`,
                }}
              />
              {input.featured && (
                // Centred under the avatar, overlapping its bottom edge by 16px
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -8,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      padding: '4px 8px',
                      borderRadius: 2,
                      background: '#ffa366',
                      color: '#1a0d33',
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    FEATURED
                  </span>
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginLeft: 40,
                width: 645,
                letterSpacing: -1,
              }}
            >
              <div
                style={{
                  display: 'block',
                  lineClamp: 2,
                  fontSize: 52,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: '#1a0d33',
                }}
              >
                {input.name}
              </div>
              <div style={{ display: 'flex', marginTop: 12, fontSize: 32, lineHeight: 1.3, color: '#594d73' }}>
                is speaking at Devcon 8 India
              </div>
            </div>
          </div>

          {/* Footer: session count left, topic tags right */}
          <div
            style={{
              position: 'absolute',
              left: 40,
              right: 40,
              top: 504,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', color: '#594d73' }}>
              <Speech width={32} height={32} strokeWidth={2} color="#594d73" />
              <span style={{ marginLeft: 12, fontSize: 24, lineHeight: 1.3, letterSpacing: -0.25 }}>{sessionLabel}</span>
            </div>
            {input.tags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {input.tags.map((tag, index) => (
                  <span
                    key={tag}
                    style={{
                      display: 'flex',
                      marginLeft: index > 0 ? 12 : 0,
                      padding: '6px 10px',
                      borderRadius: 2,
                      border: '2px solid #594d73',
                      color: '#594d73',
                      fontSize: 18,
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: 'Poppins', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Poppins', data: fonts.semibold, weight: 600, style: 'normal' },
        { name: 'Poppins', data: fonts.bold, weight: 700, style: 'normal' },
      ],
    }
  )
}
