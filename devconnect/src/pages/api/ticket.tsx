import { ImageResponse } from '@vercel/og'
import { Ticket } from 'common/components/ticket'
import { SITE_URL } from 'common/constants'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Devconnect ARG Tickets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Font
const fontUrl = new URL(`${SITE_URL}/RobotoCondensed-Bold.ttf?1`, import.meta.url)
let fontData: ArrayBuffer | null = null

async function loadFont() {
  if (!fontData) {
    const res = await fetch(fontUrl)
    fontData = await res.arrayBuffer()
  }
  return fontData
}

export default async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') || 'Anon'
  const color = searchParams.get('color') || 'blue'
  const social = searchParams.get('social') || 'false'
  const font = await loadFont()

  console.log('name', name)
  console.log('color', color)

  return new ImageResponse(<Ticket name={name} color={color} social={social} />, {
    ...size,
    fonts: [
      {
        name: 'Roboto Condensed',
        data: font,
        style: 'normal',
        weight: 700,
      },
    ],
  })
}
