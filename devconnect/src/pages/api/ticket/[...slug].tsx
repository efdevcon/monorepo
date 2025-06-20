import { ImageResponse } from '@vercel/og'
import { Ticket } from 'common/components/ticket'
import { SITE_URL } from 'common/constants'
import { NextRequest } from 'next/server'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Devconnect ARG Tickets'
export const contentType = 'image/png'

// Fonts
const condensedFontUrl = new URL(`${SITE_URL}/RobotoCondensed-Bold.ttf`, import.meta.url)
const notoSansUrl = new URL(`${SITE_URL}/NotoSansSC-Bold.ttf`, import.meta.url)
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
    const [name = 'Anon', color = 'blue', option = 'transparent'] = slug.slice(0, 3) // Only take first 3 parameters

    if (!name) {
      return new Response('Name is required', { status: 400 })
    }

    // Validate option parameter
    if (!['social', 'transparent', 'instagram'].includes(option)) {
      return new Response('Invalid option. Must be one of: social, transparent, instagram', { status: 400 })
    }

    // Decode the name parameter to handle non-ASCII characters
    const decodedName = decodeURIComponent(name)

    const { condensedFontData, notoSansData } = await loadFonts()

    console.log('Request details:', {
      originalName: name,
      decodedName,
      color,
      option,
      url: req.url,
    })

    const imageSize = option === 'instagram' ? { width: 1080, height: 1920 } : { width: 1200, height: 630 }

    console.log('imageSize', imageSize)

    return new ImageResponse(<Ticket name={decodedName} color={color} option={option} />, {
      ...imageSize,
      headers: {
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
          weight: 700,
        },
      ],
    })
  } catch (error) {
    console.error('Error generating ticket:', error)
    // Return a more detailed error response
    return new Response(`Error generating ticket: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}
