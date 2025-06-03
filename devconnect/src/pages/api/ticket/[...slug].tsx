import { ImageResponse } from '@vercel/og'
import { Ticket } from 'common/components/ticket'
import { SITE_URL } from 'common/constants'
import { NextRequest } from 'next/server'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Devconnect ARG Tickets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Fonts
const condensedFontUrl = new URL(`${SITE_URL}/RobotoCondensed-Bold.ttf`, import.meta.url)
const notoSansUrl = new URL(`${SITE_URL}/NotoSansSC-Regular.ttf`, import.meta.url)
let condensedFontData: ArrayBuffer | null = null
let notoSansData: ArrayBuffer | null = null

async function loadFonts() {
  if (!condensedFontData) {
    const res = await fetch(condensedFontUrl)
    condensedFontData = await res.arrayBuffer()
  }
  if (!notoSansData) {
    const res = await fetch(notoSansUrl)
    notoSansData = await res.arrayBuffer()
  }
  return { condensedFontData, notoSansData }
}

export default async function handler(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const slug = url.pathname.split('/').slice(3) // Remove /api/ticket from the path
    const [name = 'Anon', color = 'blue', social = 'false'] = slug

    if (!name) {
      return new Response('Name is required', { status: 400 })
    }

    const { condensedFontData, notoSansData } = await loadFonts()

    console.log('name', name)
    console.log('color', color)
    console.log('social', social)

    return new ImageResponse(<Ticket name={name} color={color} social={social} />, {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/png',
      },
      fonts: [
        {
          name: 'Roboto Condensed',
          data: condensedFontData,
          style: 'normal',
          weight: 700,
        },
        {
          name: 'Noto Sans SC',
          data: notoSansData,
          style: 'normal',
          weight: 400,
        },
      ],
    })
  } catch (error) {
    console.error('Error generating ticket:', error)
    return new Response('Error generating ticket', { status: 500 })
  }
}
