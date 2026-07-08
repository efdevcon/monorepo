// Scroll-driven stacking cards: each item sticks near the top of the viewport,
// the next one scrolls up over it, and covered cards scale down slightly.
// Adapted from fancycomponents.dev (Khoa Phan, MIT) for framer-motion + classnames.
import React, { createContext, useContext, useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion, MotionValue, UseScrollOptions } from 'framer-motion'
import cn from 'classnames'

interface StackingCardsProps extends React.PropsWithChildren, React.HTMLAttributes<HTMLDivElement> {
  totalCards: number
  scaleMultiplier?: number
  scrollOptions?: UseScrollOptions
}

interface StackingCardItemProps extends React.PropsWithChildren, React.HTMLAttributes<HTMLDivElement> {
  index: number
  topPosition?: string
}

const StackingCardsContext = createContext<{
  progress: MotionValue<number>
  scaleMultiplier?: number
  totalCards?: number
} | null>(null)

const useStackingCardsContext = () => {
  const context = useContext(StackingCardsContext)
  if (!context) throw new Error('StackingCardItem must be used within StackingCards')
  return context
}

export default function StackingCards({
  children,
  className,
  scrollOptions,
  scaleMultiplier,
  totalCards,
  ...props
}: StackingCardsProps) {
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    offset: ['start start', 'end end'],
    ...scrollOptions,
    target: targetRef,
  })

  return (
    <StackingCardsContext.Provider value={{ progress: scrollYProgress, scaleMultiplier, totalCards }}>
      <div className={cn(className)} ref={targetRef} {...props}>
        {children}
      </div>
    </StackingCardsContext.Provider>
  )
}

export const StackingCardItem = ({ index, topPosition, className, children, ...props }: StackingCardItemProps) => {
  const { progress, scaleMultiplier, totalCards = 0 } = useStackingCardsContext()
  const reducedMotion = useReducedMotion()
  const scaleTo = 1 - (totalCards - index) * (scaleMultiplier ?? 0.03)
  const scale = useTransform(progress, [index * (1 / totalCards), 1], [1, scaleTo])
  const top = topPosition ?? `${5 + index * 3}%`

  // The offset lives on the sticky wrapper (not an inner relative shift) so cards
  // sit flush in normal flow and only drop to their offset while pinned.
  // Item height (how much scroll each card gets) comes from the consumer's className.
  return (
    <div className={cn(className)} style={{ position: 'sticky', top }} {...props}>
      <motion.div style={{ scale: reducedMotion ? 1 : scale, transformOrigin: 'top' }}>{children}</motion.div>
    </div>
  )
}
