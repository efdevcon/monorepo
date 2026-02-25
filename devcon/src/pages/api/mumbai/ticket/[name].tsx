/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const RING_TEXT = 'DEVCON 8 · MUMBAI · NOV 3 TO 6 · '
const CIRCLE_RADIUS = 114
const RING_RADIUS = 132

function CircularText({
  text,
  radius,
  fontSize,
  centerX,
  centerY,
}: {
  text: string
  radius: number
  fontSize: number
  centerX: number
  centerY: number
}) {
  const chars = text.split('')
  const angleStep = 360 / chars.length

  return (
    <>
      {chars.map((char, i) => {
        const angle = i * angleStep - 90
        const rad = (angle * Math.PI) / 180
        const x = centerX + Math.cos(rad) * radius - fontSize / 2
        const y = centerY + Math.sin(rad) * radius - fontSize / 2

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              position: 'absolute',
              left: x,
              top: y,
              width: fontSize,
              height: fontSize,
              alignItems: 'center',
              justifyContent: 'center',
              transform: `rotate(${angle + 90}deg)`,
              fontSize,
              fontWeight: 700,
              color: '#4D59C7',
            }}
          >
            {char}
          </div>
        )
      })}
    </>
  )
}

export default async function handler(req: NextRequest) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const name = decodeURIComponent(segments[segments.length - 1]) || 'Anon'

  const xUsername = url.searchParams.get('x') || ''

  const siteUrl = `${url.protocol}//${url.host}`

  // Circle center: 50% horizontal (600px), 27% + half of 19% vertical
  // 27% of 630 = 170, 19% of 1200 = 228, so center Y = 170 + 114 = 284
  const centerX = 600
  const centerY = 284

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <img
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          src={`${siteUrl}/mumbai/ticket-bg.jpeg`}
          width={1200}
          height={630}
        />

        {/* Avatar circle with ring text */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            width: CIRCLE_RADIUS * 2,
            height: CIRCLE_RADIUS * 2,
            borderRadius: '50%',
            background: '#2A2557',
            top: centerY - CIRCLE_RADIUS,
            left: centerX - CIRCLE_RADIUS,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {xUsername ? (
            <img
              src={`https://unavatar.io/x/${xUsername}`}
              width={CIRCLE_RADIUS * 2}
              height={CIRCLE_RADIUS * 2}
              style={{ borderRadius: '50%', objectFit: 'cover' } as any}
            />
          ) : (
            <svg
              width={CIRCLE_RADIUS * 1.2}
              height={CIRCLE_RADIUS * 1.2}
              viewBox="0 0 100 100"
              style={{ overflow: 'hidden', borderRadius: '50%' } as any}
            >
              <circle cx="50" cy="38" r="18" fill="white" />
              <ellipse cx="50" cy="80" rx="30" ry="22" fill="white" />
            </svg>
          )}

        </div>

        {/* Circular text - positioned on root for accurate placement */}
        <CircularText text={RING_TEXT} radius={RING_RADIUS} fontSize={13} centerX={centerX} centerY={centerY} />

        {/* Name */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            position: 'absolute',
            bottom: 0,
            left: 0,
            justifyContent: 'flex-end',
            padding: '48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '56px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {name}
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
