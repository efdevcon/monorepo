import React, { useRef, useState, useCallback } from 'react'
import { TextHoverEffect } from './TextHoverEffect'
import { useTranslations } from 'next-intl'
import css from './landing-page.module.scss'

export function KeywordsSection() {
  const t = useTranslations('home')
  const desktopLines = t.raw('keywords_desktop') as string[]
  const mobileLines = t.raw('keywords_mobile') as string[]
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!textRef.current) return
    const rect = textRef.current.getBoundingClientRect()
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  const maskStyle: React.CSSProperties | undefined = hovered
    ? {
        maskImage: `radial-gradient(circle 280px at ${pos.x}px ${pos.y}px, transparent 0%, transparent 40%, black 100%)`,
        WebkitMaskImage: `radial-gradient(circle 280px at ${pos.x}px ${pos.y}px, transparent 0%, transparent 40%, black 100%)`,
      }
    : undefined

  return (
    <div
      ref={containerRef}
      className={css.keywords}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <div className={css['keywords-bg']} aria-hidden="true">
        <TextHoverEffect
          text="Devcon"
          strokeColor="rgba(22, 11, 43, 0.06)"
          fontFamily="Chloe, serif"
          fontSize="105"
          letterSpacing={-0.03}
          viewBoxOverride="0 0 355 97"
        />
      </div>
      <div
        ref={textRef}
        className={`${css['keywords-text']} ${css['keywords-desktop']}`}
        style={maskStyle}
      >
        {desktopLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </div>
      <div className={`${css['keywords-text']} ${css['keywords-mobile']}`}>
        {mobileLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
