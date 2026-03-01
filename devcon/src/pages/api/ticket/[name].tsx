/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export default async function handler(req: NextRequest) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const name = decodeURIComponent(segments[segments.length - 1]) || 'Anon'

  const xUsername = url.searchParams.get('x') || ''

  const siteUrl = `${url.protocol}//${url.host}`

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          background: '#1a0a3e',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ticket card image */}
        <img
          src={`${siteUrl}/ticket/ticket-design.png`}
          width={1060}
          height={596}
          style={{
            display: 'flex',
            borderRadius: '16px',
          }}
        />

        {/* Attendee info overlay */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                display: 'flex',
                width: '120px',
                height: '120px',
                borderRadius: '14px',
                border: '3px solid #c4880c',
                background: '#e8e4df',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {xUsername ? (
                <img
                  src={`https://unavatar.io/x/${xUsername}`}
                  width={120}
                  height={120}
                  style={{ objectFit: 'cover' } as any}
                />
              ) : (
                <svg width={80} height={80} viewBox="0 0 100 100">
                  <circle cx="50" cy="38" r="18" fill="#ccc" />
                  <ellipse cx="50" cy="80" rx="30" ry="22" fill="#ccc" />
                </svg>
              )}
            </div>

            {/* Name + ticket type */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '42px',
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
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#c4880c',
                  marginTop: '4px',
                }}
              >
                Attending Devcon
              </div>
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
