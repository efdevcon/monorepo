import React, { useMemo, useRef } from 'react'
import css from './gradient.module.scss'
import { cn } from '@/shadcn/lib/utils'
import { useDimensions } from 'hooks/use-debounced-dimensions'

interface AnimatedGradientProps {
  colors: string[]
  speed?: number
  blur?: 'light' | 'medium' | 'heavy'
  className?: string
}

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const AnimatedGradient: React.FC<AnimatedGradientProps> = ({ colors, speed = 5, blur = 'light', className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(containerRef)

  const circleSize = useMemo(() => Math.max(dimensions.width, dimensions.height), [dimensions.width, dimensions.height])

  const blurClass = blur === 'light' ? 'blur-2xl' : blur === 'medium' ? 'blur-3xl' : 'blur-[100px]'

  return (
    <div ref={containerRef} className={cn(`absolute inset-0 overflow-hidden`, className)}>
      <div className={cn(`absolute inset-0`, blurClass)}>
        {colors.map((color, index) => {
          const animationProps = {
            animation: `background-gradient ${speed}s infinite ease-in-out`,
            animationDuration: `${speed}s`,
            top: `${Math.random() * 50}%`,
            left: `${Math.random() * 50}%`,
            '--tx-1': Math.random() - 0.5,
            '--ty-1': Math.random() - 0.5,
            '--tx-2': Math.random() - 0.5,
            '--ty-2': Math.random() - 0.5,
            '--tx-3': Math.random() - 0.5,
            '--ty-3': Math.random() - 0.5,
            '--tx-4': Math.random() - 0.5,
            '--ty-4': Math.random() - 0.5,
          } as React.CSSProperties

          return (
            <svg
              key={index}
              className={cn('absolute', 'animated-background-gradient')}
              width={circleSize * randomInt(0.5, 1.5)}
              height={circleSize * randomInt(0.5, 1.5)}
              viewBox="0 100"
              style={animationProps}
            >
              <circle cx="50" cy="50" r="50" fill={color} />
            </svg>
          )
        })}
      </div>
    </div>
  )
}

export default AnimatedGradient
