import React from 'react'

interface CircularAvatarPreviewProps {
  src: string
  /** Pixel size of the circular image. Omit to fill the parent container —
   *  in that case wrap this component in something with explicit dimensions
   *  (e.g. `<div className="w-56 h-56" />`). */
  size?: number
  /** Stable id used to namespace the SVG <path> defs so multiple previews on
   *  one page don't collide on id. Defaults to a random per-render id. */
  id?: string
  /** Crops alignment that drives the ring's color theme (matches the value
   *  the frontend's CROPS slider sends to the avatar backend). Falls back
   *  to the default rainbow conic when omitted or unknown. */
  crop?: string
  /** Optional click-through URL. Mutually exclusive with `onClick`. */
  href?: string
  /** Optional click handler. Renders the preview as a button. Takes
   *  precedence over `href`. */
  onClick?: () => void
  className?: string
  title?: string
}

// Conic-gradient rings per crop. Each leans into the dominant family used by
// the backend's color-theme prompt addendum so the frame visually matches
// what the model is biased to paint inside it. Keyed by the Devcon value
// slug (matches what the avatar.tsx slider sends to the backend).
const CROP_RING_GRADIENTS: Record<string, string> = {
  // Censorship Resistance: crimson + magenta (defiant warmth)
  'censorship-resistance':
    'conic-gradient(from 180deg at 50% 50%, #b91c1c, #ec4899, #f43f5e, #fb7185, #b91c1c)',
  // Open Source: teal + cyan (oceanic openness)
  'open-source':
    'conic-gradient(from 180deg at 50% 50%, #06b6d4, #14b8a6, #2dd4bf, #67e8f9, #06b6d4)',
  // Privacy: deep violet + indigo (shadowed secrecy)
  privacy:
    'conic-gradient(from 180deg at 50% 50%, #4c1d95, #6d28d9, #7c3aed, #a78bfa, #4c1d95)',
  // Security: warm gold + amber (lantern security)
  security:
    'conic-gradient(from 180deg at 50% 50%, #b45309, #f59e0b, #fbbf24, #fcd34d, #b45309)',
}
const DEFAULT_RING_GRADIENT =
  'conic-gradient(from 180deg at 50% 50%, #7235ed, #06b6d4, #ec4899, #f59e0b, #7235ed)'

/**
 * Circular avatar preview with a Devcon-brand conic-gradient ring and a
 * "DEVCON" / "MUMBAI" wordmark curving along the inner border (DEVCON
 * top-left, MUMBAI bottom-right). Used by both the avatar-lab and the
 * production /avatar page.
 */
export function CircularAvatarPreview({ src, size, id, crop, href, onClick, className, title }: CircularAvatarPreviewProps) {
  const fallbackId = React.useId()
  const slug = (id ?? fallbackId).replace(/[^a-z0-9_-]/gi, '_')

  // Two sizing modes: explicit px via `size`, or "fill the parent" via w/h full.
  const dimStyle = size != null ? { width: size, height: size } : undefined
  const dimClass = size != null ? '' : 'w-full h-full'

  const ringGradient = (crop && CROP_RING_GRADIENTS[crop.toLowerCase()]) || DEFAULT_RING_GRADIENT

  const inner = (
    <div
      className={`rounded-full p-[3px] relative transition-transform hover:scale-[1.02] ${dimClass}`}
      style={{
        background: ringGradient,
        ...dimStyle,
      }}
    >
      <img
        src={src}
        alt="Devcon avatar — circular crop"
        className={`block rounded-full object-cover ${dimClass}`}
        style={dimStyle}
      />
      <svg
        viewBox="0 0 112 112"
        className="absolute inset-[3px] pointer-events-none w-auto h-auto"
        style={{ width: 'calc(100% - 6px)', height: 'calc(100% - 6px)' }}
        aria-hidden
      >
          <defs>
            {/* DEVCON — upper-left arc, sweep=1 (CW). At the top of the
                circle, outward = up = legible. */}
            <path id={`curve-tl-${slug}`} d="M 14 32 A 48 48 0 0 1 44 10" fill="none" />
            {/* MUMBAI — lower-right arc. Sweep=0 (CCW) so letter tops face
                toward center (UP at the bottom) for legibility. Radius 52
                tuned empirically against DEVCON (baseline r=48, letter caps
                reaching outward to ~r=52-ish in practice with this font).
                Dial: lower to pull MUMBAI further inward (away from the
                gradient ring), raise to push it back toward the ring. */}
            <path id={`curve-br-${slug}`} d="M 69 105 A 51 51 0 0 0 100 82" fill="none" />
          </defs>
          <text
            style={{
              fontSize: 7,
              letterSpacing: 1.4,
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
              fontWeight: 600,
              fill: 'white',
              opacity: 0.9,
              filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.55))',
            }}
          >
            <textPath href={`#curve-tl-${slug}`}>DEVCON</textPath>
          </text>
          <text
            style={{
              fontSize: 7,
              letterSpacing: 1.4,
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
              fontWeight: 600,
              fill: 'white',
              opacity: 0.9,
              filter: 'drop-shadow(0 0 1.5px rgba(0,0,0,0.55))',
            }}
          >
            <textPath href={`#curve-br-${slug}`}>MUMBAI</textPath>
          </text>
        </svg>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`${className ?? ''} ${dimClass}`.trim()}
      >
        {inner}
      </button>
    )
  }
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={title ?? 'Open full size'}
        className={`${className ?? ''} ${dimClass}`.trim()}
      >
        {inner}
      </a>
    )
  }
  return <div className={`${className ?? ''} ${dimClass}`.trim()}>{inner}</div>
}
