import React, { useState, useEffect, useRef, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { motion } from 'framer-motion'
import EthDiamond from './images/eth-diamond.svg'
import css from './landing-page.module.scss'
import cn from 'classnames'

gsap.registerPlugin(ScrollTrigger)

type TextSegment = {
  text: string
  bold?: boolean
}

const NARRATIVE_SECTIONS: TextSegment[][] = [
  [
    { text: 'The technology is no longer theoretical.' },
    { text: 'It is infrastructure.', bold: true },
    { text: 'Real systems are being built.' },
    { text: 'Real problems are being solved.' },
  ],
  [
    { text: 'Real communities around the world are advancing it.' },
    { text: 'Mumbai is one of its most important chapters.' },
  ],
  [
    { text: 'Growth in India is grassroots and builder-led.' },
    { text: 'Driven not by institutional mandates or market cycles, but by engineers who see technology as a tool to solve large-scale, real-world challenges.' },
  ],
  [
    { text: 'Devcon 8 comes to Mumbai to be part of that.' },
    { text: 'To contribute to it.' },
  ],
  [
    { text: 'And to demonstrate that Ethereum\u2019s commitment to decentralization, openness, and long-term thinking isn\u2019t rhetoric.' },
    { text: 'It\u2019s how we show up.', bold: true },
  ],
]

function NarrativeText({ segments, sectionKey }: { segments: TextSegment[]; sectionKey: number }) {
  type WordEntry = { word: string; bold?: boolean; lineBreak?: boolean }
  const words: WordEntry[] = []
  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s]
    const segWords = seg.text.split(' ').filter(Boolean)
    for (const w of segWords) {
      words.push({ word: w, bold: seg.bold })
    }
    // Add line break after each segment except the last
    if (s < segments.length - 1 && words.length > 0) {
      words[words.length - 1].lineBreak = true
    }
  }

  let wordIndex = 0

  return (
    <motion.div
      key={sectionKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{ display: 'flex', flexWrap: 'wrap' }}
    >
      {words.map((entry, i) => {
        const idx = wordIndex++
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: 'inline-block',
                marginRight: !entry.lineBreak && i < words.length - 1 ? '0.25em' : 0,
                overflow: 'hidden',
              }}
            >
              <motion.span
                style={{ display: 'inline-block', fontWeight: entry.bold ? 700 : undefined }}
                initial={{ opacity: 0, y: '0.5em' }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 150,
                  damping: 18,
                  delay: idx * 0.03,
                }}
              >
                {entry.word}
              </motion.span>
            </span>
            {entry.lineBreak && <span style={{ flexBasis: '100%', height: 0 }} />}
          </React.Fragment>
        )
      })}
    </motion.div>
  )
}

function PlainText({ segments }: { segments: TextSegment[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      {segments.map((seg, s) => (
        <React.Fragment key={s}>
          {seg.text.split(' ').filter(Boolean).map((word, w) => (
            <span key={w} style={{ display: 'inline-block', marginRight: '0.25em', fontWeight: seg.bold ? 700 : undefined }}>
              {word}
            </span>
          ))}
          {s < segments.length - 1 && <span style={{ flexBasis: '100%', height: 0 }} />}
        </React.Fragment>
      ))}
    </div>
  )
}

export function NarrativeBlock({ children }: { children?: React.ReactNode }) {
  const [currentSection, setCurrentSection] = useState<number | null>(null)
  const narrativeRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const currentSectionRef = useRef<number | null>(null)

  const updateSection = useCallback((index: number) => {
    if (currentSectionRef.current !== index) {
      currentSectionRef.current = index
      setCurrentSection(index)
    }
  }, [])

  useEffect(() => {
    const narrative = narrativeRef.current
    const wrapper = wrapperRef.current
    if (!narrative || !wrapper) return

    const getPinEnd = () => {
      const header = document.getElementById('header')
      const headerH = header ? header.getBoundingClientRect().height : 0
      const narrativeH = narrative.getBoundingClientRect().height
      return { headerH, pinEnd: headerH + narrativeH }
    }

    const pinTrigger = ScrollTrigger.create({
      trigger: narrative,
      start: () => `top ${getPinEnd().headerH}`,
      endTrigger: wrapper,
      end: () => `bottom ${getPinEnd().pinEnd}`,
      pin: true,
      pinSpacing: false,
      invalidateOnRefresh: true,
    })

    const sectionTrigger = ScrollTrigger.create({
      trigger: narrative,
      start: () => `top 40%`,
      endTrigger: wrapper,
      end: () => `bottom ${getPinEnd().pinEnd}`,
      invalidateOnRefresh: true,
      onUpdate: self => {
        const section = Math.min(
          Math.floor(self.progress * NARRATIVE_SECTIONS.length),
          NARRATIVE_SECTIONS.length - 1
        )
        updateSection(section)
      },
      onLeave: () => updateSection(NARRATIVE_SECTIONS.length - 1),
      onEnterBack: () => updateSection(NARRATIVE_SECTIONS.length - 1),
    })

    // Refresh after layout settles on client-side navigation
    const timeout = setTimeout(() => ScrollTrigger.refresh(), 200)

    return () => {
      clearTimeout(timeout)
      pinTrigger.kill()
      sectionTrigger.kill()
    }
  }, [updateSection])

  return (
    <div ref={wrapperRef} className={css['narrative-faq-wrapper']}>
      <div ref={narrativeRef} className={css.narrative}>
        <div className="section">
          <div className={css['narrative-inner']}>
            <div className={css['narrative-left']}>
              <div className={css['narrative-icon']}>
                <EthDiamond />
              </div>
              <h3 className={css['narrative-heading']}>
                Building the infrastructure
                <br />
                {`for tomorrow\u2019s world`}
              </h3>
            </div>

            <div className={css['narrative-right']}>
              {/* All sections in same grid cell to establish max height */}
              <div className={css['narrative-sizer']}>
                {NARRATIVE_SECTIONS.map((seg, i) => (
                  <div key={i} className={css['narrative-sizer-item']}>
                    <PlainText segments={seg} />
                  </div>
                ))}
              </div>
              {/* Animated content overlaid on top */}
              <div className={css['narrative-content']}>
                {currentSection !== null && (
                  <NarrativeText
                    key={currentSection}
                    segments={NARRATIVE_SECTIONS[currentSection]}
                    sectionKey={currentSection}
                  />
                )}
              </div>
            </div>

            <div className={css['narrative-indicators']}>
              {NARRATIVE_SECTIONS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(css.indicator, i === currentSection && css.active)}
                  onClick={() => setCurrentSection(i)}
                  aria-label={`Go to section ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
