import React, { useRef, useState, useCallback } from 'react'
import { TextHoverEffect } from './TextHoverEffect'
import css from './landing-page.module.scss'

export function KeywordsSection() {
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
        TALKS &bull; WORKSHOPS &bull; NETWORKING &bull; COWORK &bull; AI
        <br />
        CENSORSHIP RESISTANCE &bull; OPEN SOURCE &bull; PRIVACY &bull; SECURITY
        <br />
        DeFI &bull; Social &bull; CYPHERPUNK &bull; Art &bull; REAL WORLD ETHEREUM
      </div>
      <div className={`${css['keywords-text']} ${css['keywords-mobile']}`}>
        TALKS &bull; WORKSHOPS
        <br />
        NETWORKING &bull; COWORK &bull; AI
        <br />
        CENSORSHIP RESISTANCE
        <br />
        OPEN SOURCE &bull; PRIVACY
        <br />
        SECURITY &bull; DeFI &bull; Social
        <br />
        CYPHERPUNK &bull; Art
        <br />
        REAL WORLD ETHEREUM
      </div>
    </div>
  )
}
