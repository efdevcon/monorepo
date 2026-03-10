/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextApiRequest, NextApiResponse } from 'next'
import sharp from 'sharp'

const BG = '#000000'
const BUCKET = 'og-tickets'

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

function getCacheKey(name: string, xUsername: string): string {
  return `${sanitize(name)}--${sanitize(xUsername || '_')}.jpg`
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

async function uploadImage(key: string, imageBytes: Buffer): Promise<void> {
  await fetch(objectUrl(key), {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: new Uint8Array(imageBytes),
  })
}

async function pngToJpeg(pngBuffer: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(pngBuffer)).jpeg({ quality: 85 }).toBuffer()
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
          src={`${siteUrl}/ticket/og-new-hd.jpg`}
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Route: /api/ticket/{name} or /api/ticket/{name}/{hash} or /api/ticket/{name}/{hash}/{cacheBuster}
  const params = req.query.params as string[]
  const rawName = decodeURIComponent(params[0] || 'Anon')
  const hashParam = params[1] || (req.query.h as string) || ''
  const xUsername = (req.query.x as string) || ''
  // params[2] is the cache buster — ignored by the handler, only used to make the URL unique

  const displayName = rawName !== 'Anon' ? rawName : xUsername ? `@${xUsername}` : 'Anon'
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers.host || 'localhost:3000'
  const siteUrl = `${proto}://${host}`

  const canCache = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  const cacheKey = hashParam
    ? getCacheKey(rawName, `h_${hashParam}`)
    : getCacheKey(rawName, xUsername)
  console.log(`[og] name="${rawName}" x="${xUsername}" h="${hashParam}" key="${cacheKey}" canCache=${!!canCache}`)

  // Look up avatar from Supabase:
  // - ?h= param: hash-based avatar uploaded by /api/ticket/generate
  // - ?x= param (legacy): avatar keyed by X username
  let avatarSrc: string | null = null
  let avatarLastModified = 0
  if (hashParam && canCache) {
    const cachedAvatarUrl = publicUrl(`${hashParam}_avatar.png`)
    try {
      const check = await fetch(cachedAvatarUrl, { method: 'HEAD' })
      if (check.ok) {
        avatarSrc = cachedAvatarUrl
        const lm = check.headers.get('last-modified')
        if (lm) avatarLastModified = new Date(lm).getTime()
      }
    } catch {
      // No cached avatar — render without it
    }
  } else if (xUsername && canCache) {
    const cachedAvatarUrl = publicUrl(`avatar--${sanitize(xUsername)}.png`)
    try {
      const check = await fetch(cachedAvatarUrl, { method: 'HEAD' })
      if (check.ok) {
        avatarSrc = cachedAvatarUrl
        const lm = check.headers.get('last-modified')
        if (lm) avatarLastModified = new Date(lm).getTime()
      }
    } catch {
      // No cached avatar — render without it
    }
  }

  // Check cache — but skip if avatar is newer (OG was generated without it or with old version)
  if (canCache) {
    try {
      const ogHead = await fetch(publicUrl(cacheKey), { method: 'HEAD' })
      if (ogHead.ok) {
        const ogLastModified = new Date(ogHead.headers.get('last-modified') || 0).getTime()
        if (!avatarLastModified || ogLastModified >= avatarLastModified) {
          const cached = await getCachedImage(cacheKey)
          if (cached) {
            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
            return res.send(Buffer.from(cached))
          }
        }
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
  const pngBytes = await imageResponse.arrayBuffer()
  const jpegBuffer = await pngToJpeg(pngBytes)

  // Upload to cache (avatarless OG images get busted when avatar is uploaded)
  if (canCache) {
    uploadImage(cacheKey, jpegBuffer).catch(() => {})
  }

  res.setHeader('Content-Type', 'image/jpeg')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  return res.send(jpegBuffer)
}
