'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import cn from 'classnames'

interface ShootingStar {
  id: number
  x: number
  y: number
  angle: number
  scale: number
  speed: number
  distance: number
}

export interface ShootingStarsProps {
  className?: string
  children?: React.ReactNode
  /** Minimum star speed */
  minSpeed?: number
  /** Maximum star speed */
  maxSpeed?: number
  /** Minimum delay between stars (ms) */
  minDelay?: number
  /** Maximum delay between stars (ms) */
  maxDelay?: number
  /** Color of the star head */
  starColor?: string
  /** Color of the gradient trail */
  trailColor?: string
  /** Width of the star */
  starWidth?: number
  /** Height of the star */
  starHeight?: number
}

export function ShootingStars({
  className,
  children,
  minSpeed = 2,
  maxSpeed = 7,
  minDelay = 600,
  maxDelay = 1800,
  starColor = '#ffffff',
  trailColor = '#c0c0c0',
  starWidth = 12,
  starHeight = 3,
}: ShootingStarsProps) {
  const [stars, setStars] = useState<ShootingStar[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getRandomStartPoint = useCallback(() => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0, angle: 45 }

    const { width, height } = container.getBoundingClientRect()
    const side = Math.floor(Math.random() * 4)

    switch (side) {
      case 0: // Top edge
        return { x: Math.random() * width, y: 0, angle: 45 }
      case 1: // Right edge
        return { x: width, y: Math.random() * height, angle: 135 }
      case 2: // Bottom edge
        return { x: Math.random() * width, y: height, angle: 225 }
      case 3: // Left edge
        return { x: 0, y: Math.random() * height, angle: 315 }
      default:
        return { x: 0, y: 0, angle: 45 }
    }
  }, [])

  const createStar = useCallback(() => {
    const { x, y, angle } = getRandomStartPoint()
    const newStar: ShootingStar = {
      id: Date.now() + Math.random(),
      x,
      y,
      angle,
      scale: 1,
      speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
      distance: 0,
    }
    setStars(prev => [...prev, newStar])

    const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay
    timeoutRef.current = setTimeout(createStar, randomDelay)
  }, [getRandomStartPoint, minSpeed, maxSpeed, minDelay, maxDelay])

  useEffect(() => {
    // Start spawning stars after mount
    const initialDelay = setTimeout(createStar, 100)

    const handleVisibility = () => {
      if (document.hidden) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setStars([])
      } else {
        setTimeout(createStar, 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearTimeout(initialDelay)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [createStar])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const moveStars = () => {
      const { width, height } = container.getBoundingClientRect()

      setStars(prevStars =>
        prevStars
          .map(star => {
            const newX = star.x + star.speed * Math.cos((star.angle * Math.PI) / 180)
            const newY = star.y + star.speed * Math.sin((star.angle * Math.PI) / 180)
            const newDistance = star.distance + star.speed
            const newScale = 1 + newDistance / 100

            // Remove if out of bounds
            if (newX < -50 || newX > width + 50 || newY < -50 || newY > height + 50) {
              return null
            }

            return {
              ...star,
              x: newX,
              y: newY,
              distance: newDistance,
              scale: newScale,
            }
          })
          .filter((star): star is ShootingStar => star !== null)
      )

      animationRef.current = requestAnimationFrame(moveStars)
    }

    animationRef.current = requestAnimationFrame(moveStars)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <svg className="absolute inset-0 h-full w-full" style={{ maskImage: 'linear-gradient(to bottom, black 35%, transparent 65%)', WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 65%)' }}>
        <defs>
          <linearGradient id="shooting-star-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor={trailColor} stopOpacity={0} />
            <stop offset="100%" stopColor={starColor} stopOpacity={1} />
          </linearGradient>
        </defs>

        {stars.map(star => (
          <rect
            key={star.id}
            fill="url(#shooting-star-gradient)"
            width={starWidth * star.scale}
            height={starHeight}
            x={star.x}
            y={star.y}
            transform={`rotate(${star.angle}, ${star.x + (starWidth * star.scale) / 2}, ${star.y + starHeight / 2})`}
          />
        ))}
      </svg>

      {/* Content layer */}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  )
}

export default function ShootingStarsDemo() {
  return <ShootingStars />
}
