/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import type { NextApiRequest, NextApiResponse } from 'next'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const BG = '#000000'

// Pre-load background image as data URL — avoids self-referencing HTTP fetch that can deadlock
let bgDataUrl: string
try {
  const bgBuffer = readFileSync(join(process.cwd(), 'public', 'ticket', 'og-new-hd.jpg'))
  bgDataUrl = `data:image/jpeg;base64,${bgBuffer.toString('base64')}`
} catch {
  bgDataUrl = ''
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

// Pre-load fonts from local files for Netlify reliability (no external font fetches at request time).
let cachedFonts: { bold: ArrayBuffer; medium: ArrayBuffer }
try {
  const boldFont = readFileSync(join(process.cwd(), 'public', 'fonts', 'Poppins-800.ttf'))
  const mediumFont = readFileSync(join(process.cwd(), 'public', 'fonts', 'Poppins-500.ttf'))
  cachedFonts = {
    bold: bufferToArrayBuffer(boldFont),
    medium: bufferToArrayBuffer(mediumFont),
  }
} catch (error) {
  throw new Error(`[og] Missing local Poppins font files in public/fonts: ${(error as Error).message}`)
}

async function pngToJpeg(pngBuffer: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(pngBuffer))
    .jpeg({
      quality: 80,
      progressive: true,
      optimiseCoding: true,
      mozjpeg: true,
    })
    .toBuffer()
}

const BUCKET = 'og-tickets'

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

function cacheKey(name: string): string {
  return `${sanitize(name)}.jpg`
}

function publicUrl(key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`
}

function objectUrl(key: string): string {
  return `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`
}

async function readFromCache(key: string): Promise<{ bytes: Buffer; ageMs: number } | null> {
  try {
    const r = await fetch(publicUrl(key), { signal: AbortSignal.timeout(2000) })
    if (!r.ok) return null
    const lastModified = r.headers.get('last-modified')
    const lastModifiedMs = lastModified ? new Date(lastModified).getTime() : 0
    const ageMs = lastModifiedMs > 0 ? Date.now() - lastModifiedMs : Infinity
    return { bytes: Buffer.from(await r.arrayBuffer()), ageMs }
  } catch {
    return null
  }
}

async function writeToCache(key: string, bytes: Buffer): Promise<void> {
  try {
    await fetch(objectUrl(key), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
      body: new Uint8Array(bytes),
    })
  } catch {
    // Cache write failure shouldn't break the response
  }
}

async function regenerateAndCache(displayName: string, key: string, siteUrl: string): Promise<Buffer> {
  const avatarSrc = isEnsName(displayName) ? await resolveEnsAvatar(displayName, 6000) : null
  const bg = bgDataUrl || `${siteUrl}/ticket/og-new-hd.jpg`
  const imageResponse = generateImage(displayName, avatarSrc, bg, cachedFonts)
  const pngBytes = await imageResponse.arrayBuffer()
  const jpegBuffer = await pngToJpeg(pngBytes)
  await writeToCache(key, jpegBuffer)
  return jpegBuffer
}

const STALE_AFTER_MS = 12 * 60 * 60 * 1000

function isEnsName(name: string): boolean {
  return /\.eth$/i.test(name.trim())
}

async function resolveEnsAvatar(name: string, timeoutMs: number): Promise<string | null> {
  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(process.env.NEXT_PUBLIC_INFURA_APIKEY ? `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_APIKEY}` : undefined),
    })
    const avatar = await Promise.race([
      client.getEnsAvatar({ name: normalize(name) }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ])
    return avatar || null
  } catch {
    return null
  }
}

function generateImage(displayName: string, avatarSrc: string | null, bgSrc: string, fonts: { bold: ArrayBuffer; medium: ArrayBuffer }) {
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
          src={bgSrc}
          width="100%"
          height="100%"
          style={{
            display: 'flex',
            borderRadius: '16px',
          }}
        />

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
        { name: 'Poppins', data: fonts.bold, weight: 800, style: 'normal' },
        { name: 'Poppins', data: fonts.medium, weight: 500, style: 'normal' },
      ],
    }
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Catch-all route serves both shapes:
  //   /api/ticket/{name}.jpg            — slug = [`{name}.jpg`]
  //   /api/ticket/{name}/{buster}.jpg   — slug = [`{name}`, `{buster}.jpg`]
  // The cacheBuster only exists to give social scrapers a unique URL; the
  // generated image is keyed by `name` alone (Supabase cache).
  const slug = req.query.slug
  const slugArr = Array.isArray(slug) ? slug : slug ? [slug] : []
  const rawName = slugArr.length >= 2 ? slugArr[0] : (slugArr[0] || 'Anon.jpg').replace(/\.jpg$/i, '')
  const nameParam = decodeURIComponent(rawName.replace(/\.jpg$/i, '').replace(/\+/g, ' '))
  const displayName = nameParam || 'Anon'

  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers.host || 'localhost:3000'
  const siteUrl = `${proto}://${host}`

  const canCache = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const key = cacheKey(displayName)

  if (canCache) {
    const cached = await readFromCache(key)
    if (cached) {
      const isStale = cached.ageMs > STALE_AFTER_MS
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400')
      res.setHeader('X-Cache', isStale ? 'STALE' : 'HIT')
      res.send(cached.bytes)
      // Background revalidation — runtime may or may not finish; next stale request retries.
      if (isStale) {
        regenerateAndCache(displayName, key, siteUrl).catch(() => {})
      }
      return
    }
  }

  // Cache miss — generate synchronously and write to cache
  const jpegBuffer = await regenerateAndCache(displayName, key, siteUrl)

  res.setHeader('Content-Type', 'image/jpeg')
  res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400')
  res.setHeader('X-Cache', 'MISS')
  return res.send(jpegBuffer)
}
