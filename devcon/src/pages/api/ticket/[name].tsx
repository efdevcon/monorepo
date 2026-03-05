/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const BG = '#000000'

export default async function handler(req: NextRequest) {
  const poppinsBold = fetch('https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDD4V1s.ttf').then(
    res => res.arrayBuffer()
  )
  const poppinsMedium = fetch('https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9V1s.ttf').then(
    res => res.arrayBuffer()
  )

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const rawName = decodeURIComponent(segments[segments.length - 1]) || 'Anon'
  const xUsername = url.searchParams.get('x') || ''

  const displayName = rawName !== 'Anon' ? rawName : xUsername ? `@${xUsername}` : 'Anon'
  const avatarSrc = xUsername ? `https://unavatar.io/x/${xUsername}` : null

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
        <img
          src={`${siteUrl}/ticket/og-new-hd.png`}
          width="100%"
          height="100%"
          style={{
            display: 'flex',
            borderRadius: '16px',
          }}
        />

        {/* Name + avatar overlay — vertically centered, left-aligned */}
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
            paddingLeft: '188px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            {avatarSrc && (
              <img
                src={avatarSrc}
                width={100}
                height={100}
                style={{
                  borderRadius: '12%',
                  border: '3px solid #D65600',
                  objectFit: 'cover',
                  background: '#e8e4df',
                }}
              />
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Poppins',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: '#160b2b',
                  lineHeight: 1.15,
                  letterSpacing: '-0.5px',
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Poppins',
                  fontSize: '24px',
                  fontWeight: 500,
                  color: '#D65600',
                  marginTop: '4px',
                  letterSpacing: '-0.5px',
                }}
              >
                is attending Devcon India
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Poppins',
          data: await poppinsBold,
          weight: 800,
          style: 'normal',
        },
        {
          name: 'Poppins',
          data: await poppinsMedium,
          weight: 500,
          style: 'normal',
        },
      ],
    }
  )
}
