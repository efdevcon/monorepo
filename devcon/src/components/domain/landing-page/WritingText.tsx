import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { motion, useInView } from 'framer-motion'

type TextSegment = {
  text: string
  className?: string
}

type WritingTextProps = {
  text?: string
  segments?: TextSegment[]
  className?: string
  style?: CSSProperties
  stagger?: number
  stiffness?: number
  damping?: number
  wordSpacing?: number
  triggerOnScroll?: boolean
}

function WritingText({
  text,
  segments,
  className,
  style,
  stagger = 0.04,
  stiffness = 170,
  damping = 15,
  wordSpacing = 0.25,
  triggerOnScroll = false,
}: WritingTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  const shouldAnimate = triggerOnScroll ? isInView : true

  const words: { word: string; className?: string }[] = []
  if (segments) {
    for (const seg of segments) {
      for (const w of seg.text.split(' ')) {
        if (w) words.push({ word: w, className: seg.className })
      }
    }
  } else if (text) {
    for (const w of text.split(' ')) {
      if (w) words.push({ word: w })
    }
  }

  return (
    <span ref={ref} className={className} style={{ display: 'inline-flex', flexWrap: 'wrap', ...style }}>
      {words.map((entry, i) => (
        <span
          key={i}
          className={entry.className}
          style={{
            display: 'inline-block',
            marginRight: i < words.length - 1 ? `${wordSpacing}em` : 0,
            overflow: 'hidden',
          }}
        >
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: '0.5em' }}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.5em' }}
            transition={{
              type: 'spring',
              stiffness,
              damping,
              delay: i * stagger,
            }}
          >
            {entry.word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export { WritingText }
export type { WritingTextProps, TextSegment }
