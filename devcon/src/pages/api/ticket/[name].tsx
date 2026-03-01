/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const BG = '#000000'
const CARD_W = 1060
const CARD_H = 596
const HOLE = 80

export default async function handler(req: NextRequest) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const name = decodeURIComponent(segments[segments.length - 1]) || 'Anon'

  const siteUrl = `${url.protocol}//${url.host}`

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: BG,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ticket card with punch holes */}
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: CARD_W,
            height: CARD_H,
          }}
        >
          <img
            src={`${siteUrl}/ticket/ticket-design.png`}
            width={CARD_W}
            height={CARD_H}
            style={{
              display: 'flex',
              borderRadius: '16px',
            }}
          />

          {/* Left punch hole */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              left: -(HOLE / 2),
              top: (CARD_H - HOLE) / 2,
              width: HOLE,
              height: HOLE,
              borderRadius: '50%',
              background: BG,
            }}
          />

          {/* Right punch hole */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              right: -(HOLE / 2),
              top: (CARD_H - HOLE) / 2,
              width: HOLE,
              height: HOLE,
              borderRadius: '50%',
              background: BG,
            }}
          />

          {/* Name overlay — vertically centered, left-aligned */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              paddingLeft: '80px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '48px',
                fontWeight: 900,
                color: '#1a1a2e',
                lineHeight: 1.15,
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                fontWeight: 600,
                color: '#c4880c',
                marginTop: '6px',
              }}
            >
              Attending Devcon
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
