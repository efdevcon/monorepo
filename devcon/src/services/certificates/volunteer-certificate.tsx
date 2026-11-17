/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'
import { poppinsFonts, socialAssetDataUrl } from 'services/social-cards/assets'

/**
 * Devcon 8 volunteer certificate in LinkedIn's landscape image shape (1.91:1,
 * its 1200×627 at 2x), so it posts uncropped. The team's certificate design
 * (lavender rings, dotted arcs, sparkles, wording) under a banner of the key
 * visual's moon and Gateway. Poppins as on the DC8 share cards.
 */
export const CERTIFICATE_SIZE = { width: 2400, height: 1254 }
const W = CERTIFICATE_SIZE.width
const H = CERTIFICATE_SIZE.height

const BANNER_HEIGHT = 560
// kv-bg.jpg (1966×1106) drawn full width; this offset frames the moon and the Gateway.
const BANNER_ART_HEIGHT = Math.round((W * 1106) / 1966)
const BANNER_ART_OFFSET = -320

const INK = '#1c1240'
const BODY = '#1f1838'
const MUTED = '#4b4466'
const PURPLE = '#5b33d6'
const ORANGE = '#e9a23b'
const LAVENDER = '#efe9fa'

/** A four-point sparkle centered on (x, y), `r` from center to tip. */
function sparkle(x: number, y: number, r: number, fill: string): string {
  const w = r * 0.18
  const d = [
    `M${x},${y - r}`,
    `Q${x + w},${y - w} ${x + r},${y}`,
    `Q${x + w},${y + w} ${x},${y + r}`,
    `Q${x - w},${y + w} ${x - r},${y}`,
    `Q${x - w},${y - w} ${x},${y - r} Z`,
  ].join(' ')
  return `<path fill="${fill}" d="${d}"/>`
}

// Two dotted arcs of circles centered below the canvas: their tops hide under
// the banner, so only the sides show, curving from the banner out to the left
// and right edges above the footer, clear of the text column.
const ARC_CX = W / 2
const ARC_CY = 1700

function dottedCircle(r: number, stroke: string): string {
  return `<circle cx="${ARC_CX}" cy="${ARC_CY}" r="${r}" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 20"/>`
}

/**
 * Background, dotted arcs and sparkles behind the text: lavender where the
 * banner fades out, lightening toward the bottom (the banner covers the top).
 */
const DECOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="${(BANNER_HEIGHT / H).toFixed(3)}" stop-color="${LAVENDER}"/>
      <stop offset="1" stop-color="#faf8fe"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${dottedCircle(1550, '#8fd6d8')}
  ${dottedCircle(1400, '#b9a5ef')}
  ${sparkle(300, 740, 38, ORANGE)}
  ${sparkle(2060, 690, 30, '#7fd3d6')}
  ${sparkle(2090, 990, 24, ORANGE)}
  ${sparkle(300, 1000, 24, '#b9a5ef')}
</svg>`
const DECOR = `data:image/svg+xml;base64,${Buffer.from(DECOR_SVG).toString('base64')}`

/** The name stays on one line: long names step down. */
function nameSize(name: string): number {
  if (name.length > 44) return 60
  if (name.length > 34) return 74
  return 92
}

// Kept on one line in the body: no-break spaces (the word split below breaks at plain spaces only).
const DATES = 'November\u00a03\u00a0to\u00a06,\u00a02026'

/** The body sentence as words, so the bold parts wrap with the rest (satori lays out spans as boxes). */
function words(parts: { text: string; bold?: boolean }[]) {
  const out: { text: string; bold: boolean; spaceAfter: boolean }[] = []
  for (const part of parts) {
    for (const token of part.text.split(/( +)/)) {
      if (!token) continue
      if (/^ +$/.test(token)) {
        if (out.length) out[out.length - 1].spaceAfter = true
      } else {
        out.push({ text: token, bold: !!part.bold, spaceAfter: false })
      }
    }
  }
  return out
}

export function renderVolunteerCertificate({ name, role }: { name: string; role: string }) {
  const fonts = poppinsFonts()
  const body = words([
    { text: 'joined the volunteer crew as ' },
    { text: role, bold: true },
    { text: ' at ' },
    { text: 'Devcon 8 India', bold: true },
    {
      text: `, held at the Jio World Centre in Mumbai from ${DATES}, and helped make it happen with time, energy and a lot of heart.`,
    },
  ])
  const label = { fontSize: 19, fontWeight: 600, letterSpacing: 4, color: MUTED } as const
  const footerValue = { fontSize: 32, fontWeight: 800, color: INK, marginTop: 4 } as const

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          fontFamily: 'Poppins',
          color: BODY,
        }}
      >
        <img src={DECOR} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} />

        <div
          style={{ display: 'flex', position: 'relative', width: '100%', height: BANNER_HEIGHT, overflow: 'hidden' }}
        >
          <img
            src={socialAssetDataUrl('dc8/kv-bg.jpg')}
            width={W}
            height={BANNER_ART_HEIGHT}
            style={{ position: 'absolute', left: 0, top: BANNER_ART_OFFSET }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 220,
              backgroundImage: `linear-gradient(to bottom, rgba(239,233,250,0), ${LAVENDER})`,
            }}
          />
        </div>

        <img src={socialAssetDataUrl('dc8/logo-508.png')} width={440} height={194} style={{ marginTop: -140 }} />

        <div style={{ display: 'flex', marginTop: 22, fontSize: 23, fontWeight: 700, letterSpacing: 7, color: PURPLE }}>
          CERTIFICATE OF VOLUNTEERING
        </div>
        <div style={{ display: 'flex', marginTop: 30, fontSize: 30, color: MUTED }}>
          Devcon 8 India proudly certifies that
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 4,
            maxWidth: 2000,
            justifyContent: 'center',
            fontSize: nameSize(name),
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.12,
            color: INK,
          }}
        >
          {name}
        </div>
        <div
          style={{ display: 'flex', marginTop: 22, width: 200, height: 8, borderRadius: 4, backgroundColor: ORANGE }}
        />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 30,
            maxWidth: 1760,
            fontSize: 29,
            lineHeight: 1.55,
          }}
        >
          {body.map((w, i) => (
            <span
              key={i}
              style={{ fontWeight: w.bold ? 700 : 400, color: w.bold ? INK : BODY, marginRight: w.spaceAfter ? 8 : 0 }}
            >
              {w.text}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', marginTop: 26, fontSize: 36, fontWeight: 700, color: PURPLE }}>
          Thank you for helping the infinite garden grow, one shift at a time.
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 110,
            right: 110,
            bottom: 48,
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={label}>WITH GRATITUDE</span>
            <span style={footerValue}>The Devcon team</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={label}>NOVEMBER 3–6, 2026</span>
            <span style={footerValue}>Jio World Centre, Mumbai</span>
          </div>
        </div>
      </div>
    ),
    {
      ...CERTIFICATE_SIZE,
      fonts: [
        { name: 'Poppins', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Poppins', data: fonts.semibold, weight: 600, style: 'normal' },
        { name: 'Poppins', data: fonts.bold, weight: 700, style: 'normal' },
        { name: 'Poppins', data: fonts.extrabold, weight: 800, style: 'normal' },
      ],
    }
  )
}
