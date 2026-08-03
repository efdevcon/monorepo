import React from 'react'
import cn from 'classnames'
import css from './reveal.module.scss'

// Fires once when the element scrolls meaningfully into view, then stops
// observing. The negative bottom margin keeps entrances from starting right
// at the fold.
const useInViewOnce = (ref: React.RefObject<HTMLElement | null>, disabled = false) => {
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    if (disabled) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -5% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, disabled])

  return inView
}

const RevealGroupContext = React.createContext<boolean | null>(null)

interface RevealGroupProps {
  className?: string
  children: React.ReactNode
}

// Shared trigger: once the group container scrolls into view, every Reveal
// inside plays its full delay ladder in sequence — no per-item scroll needed.
export const RevealGroup = ({ className, children }: RevealGroupProps) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const shown = useInViewOnce(ref)

  return (
    <div ref={ref} className={className}>
      <RevealGroupContext.Provider value={shown}>{children}</RevealGroupContext.Provider>
    </div>
  )
}

interface RevealProps {
  /** Stagger offset in ms, applied as transition-delay */
  delay?: number
  /** Set false to rise + fade without the scale settle */
  scale?: boolean
  className?: string
  children: React.ReactNode
}

// One-shot entrance played the first time the element (or its enclosing
// RevealGroup) scrolls into view: fade in while rising 16px, optionally from
// scale(0.95), to rest. prefers-reduced-motion shows content immediately
// (handled in the stylesheet).
export const Reveal = ({ delay = 0, scale = true, className, children }: RevealProps) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const groupShown = React.useContext(RevealGroupContext)
  const selfShown = useInViewOnce(ref, groupShown !== null)
  const shown = groupShown !== null ? groupShown : selfShown

  return (
    <div
      ref={ref}
      className={cn(css['reveal'], { [css['flat']]: !scale, [css['shown']]: shown }, className)}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
