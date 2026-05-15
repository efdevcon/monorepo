import React, { useMemo, useRef, useState, useEffect } from 'react'
import styles from './animated-gradient.module.scss'

interface AnimatedGradientBackgroundProps {
  colors: string[]
  speed?: number
  blur?: 'light' | 'medium' | 'heavy'
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const randomCubicBezier = () => {
  const p1x = (Math.random() * 0.6 + 0.2).toFixed(2)
  const p1y = (Math.random() * 0.8 + 0.1).toFixed(2)
  const p2x = (Math.random() * 0.6 + 0.2).toFixed(2)
  const p2y = (Math.random() * 0.8 + 0.1).toFixed(2)
  return `cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y})`
}

// Drifting blurred circles behind the constellation. CSS keyframes
// (`background-gradient`) are declared in the matching .module.scss so each
// circle's `--tx-*` / `--ty-*` translation values drive the path.
export function AnimatedGradientBackground({ colors, speed = 5, blur = 'light' }: AnimatedGradientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let raf = 0
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      })
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const circleSize = useMemo(() => (width + height) / 2, [width, height])

  const blurClass = blur === 'light' ? 'blur-2xl' : blur === 'medium' ? 'blur-3xl' : 'blur-[100px]'

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`absolute inset-0 overflow-hidden pointer-events-none ${styles.faded}`}
    >
      <div className={`absolute inset-0 ${blurClass}`}>
        {colors.map((color, index) => {
          const style: React.CSSProperties & Record<string, string | number> = {
            '--duration': `${speed * (0.8 + Math.random() * 0.4)}s`,
            '--ease': randomCubicBezier(),
            // Spread initial positions across the whole canvas (not just the
            // top-left quadrant) so the palette doesn't concentrate in one
            // corner before the animation has a chance to drift it.
            top: `${Math.random() * 80}%`,
            left: `${Math.random() * 80}%`,
            '--tx-1': Math.random() - 0.5,
            '--ty-1': Math.random() - 0.5,
            '--tx-2': Math.random() - 0.5,
            '--ty-2': Math.random() - 0.5,
            '--tx-3': Math.random() - 0.5,
            '--ty-3': Math.random() - 0.5,
            '--tx-4': Math.random() - 0.5,
            '--ty-4': Math.random() - 0.5,
          }
          return (
            <svg
              key={index}
              className={styles.circle}
              width={circleSize * randomInt(0.5, 1.5)}
              height={circleSize * randomInt(0.5, 1.5)}
              viewBox="0 0 100 100"
              style={style}
            >
              <circle cx="50" cy="50" r="50" fill={color} />
            </svg>
          )
        })}
      </div>
    </div>
  )
}
