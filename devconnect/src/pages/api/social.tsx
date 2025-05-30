import { ImageResponse } from '@vercel/og'
import { Ticket } from 'common/components/ticket'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Devconnect ARG Tickets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Font
const fontUrl = new URL('http://localhost:3000/RobotoCondensed-Bold.ttf?1', import.meta.url)
let fontData: ArrayBuffer | null = null

async function loadFont() {
  if (!fontData) {
    const res = await fetch(fontUrl)
    fontData = await res.arrayBuffer()
  }
  return fontData
}

export default async function Image({ searchParams }: { searchParams: { name?: string; color?: string } }) {
  const name = searchParams?.name || 'Anon'
  const color = searchParams?.color || 'blue'
  const font = await loadFont()

  return new ImageResponse(<Ticket name={name} color={color} />, {
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
