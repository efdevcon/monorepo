import React from 'react'

interface CountdownTextProps {
  value: string | null
  className?: string
}

/**
 * Renders a ticking countdown string with a fixed footprint so adjacent
 * elements don't shift as the digits change each second.
 *
 * Poppins (the project's body font) doesn't ship real tabular-figures, so
 * `tabular-nums` alone doesn't keep digit widths stable. Instead we render
 * an invisible "all 8s" placeholder (8 is typically the widest digit in
 * proportional fonts) at the same character count as the live value, then
 * absolutely position the real countdown on top. The container takes the
 * max width once and never resizes; the inner digits may still visually
 * shuffle within that box, but nothing around them moves.
 */
export function CountdownText({ value, className = '' }: CountdownTextProps) {
  if (!value) return null
  const placeholder = value.replace(/\d/g, '8')
  return (
    <span className={`relative inline-block whitespace-pre ${className}`}>
      <span aria-hidden className="invisible">
        {placeholder}
      </span>
      <span className="absolute inset-0">{value}</span>
    </span>
  )
}
