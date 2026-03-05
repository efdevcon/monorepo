/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const BG = '#000000'
const BUCKET = 'og-tickets'

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

function getCacheKey(name: string, xUsername: string): string {
  return `${sanitize(name)}--${sanitize(xUsername || '_')}.png`
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }
}

function objectUrl(key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`
}

function publicUrl(key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`
}

async function getCachedImage(key: string): Promise<ArrayBuffer | null> {
  const res = await fetch(publicUrl(key))
  if (!res.ok) return null
  return res.arrayBuffer()
}

async function uploadImage(key: string, imageBytes: ArrayBuffer): Promise<void> {
  await fetch(objectUrl(key), {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: imageBytes,
  })
}

function generateImage(displayName: string, avatarSrc: string | null, siteUrl: string, fonts: { bold: ArrayBuffer; medium: ArrayBuffer }) {
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
          data: fonts.bold,
          weight: 800,
          style: 'normal',
        },
        {
          name: 'Poppins',
          data: fonts.medium,
          weight: 500,
          style: 'normal',
        },
      ],
    }
  )
}

export default async function handler(req: NextRequest) {
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const rawName = decodeURIComponent(segments[segments.length - 1]) || 'Anon'
  const xUsername = url.searchParams.get('x') || ''

  const displayName = rawName !== 'Anon' ? rawName : xUsername ? `@${xUsername}` : 'Anon'
  const siteUrl = `${url.protocol}//${url.host}`

  const canCache = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  const cacheKey = getCacheKey(rawName, xUsername)

  // Only use avatar if cached in Supabase (uploaded by a real visitor).
  // Never fall back to unavatar.io — it's rate-limited and a broken response
  // would get baked into the cached OG image permanently.
  let avatarSrc: string | null = null
  if (xUsername && canCache) {
    const cachedAvatarUrl = publicUrl(`avatar--${sanitize(xUsername)}.png`)
    try {
      const check = await fetch(cachedAvatarUrl, { method: 'HEAD' })
      if (check.ok) avatarSrc = cachedAvatarUrl
    } catch {
      // No cached avatar — render without it
    }
  }

  // Check cache
  if (canCache) {
    try {
      const cached = await getCachedImage(cacheKey)
      if (cached) {
        return new Response(cached, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }
    } catch {
      // Cache miss or error — fall through to generate
    }
  }

  // Generate image
  const [boldFont, mediumFont] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDD4V1s.ttf').then(res => res.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9V1s.ttf').then(res => res.arrayBuffer()),
  ])

  const imageResponse = generateImage(displayName, avatarSrc, siteUrl, { bold: boldFont, medium: mediumFont })

  // Upload to cache (avatarless OG images get busted when avatar is uploaded)
  if (canCache) {
    const imageBytes = await imageResponse.arrayBuffer()

    // Fire-and-forget upload
    uploadImage(cacheKey, imageBytes.slice(0)).catch(() => {})

    return new Response(imageBytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  return imageResponse
}
