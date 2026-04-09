import React from 'react'
import { useMotionValue, useSpring, useInView } from 'framer-motion'

type CountingNumberProps = {
  number: number
  fromNumber?: number
  prefix?: string
  suffix?: string
  decimalPlaces?: number
  className?: string
  style?: React.CSSProperties
}

export function CountingNumber({
  number,
  fromNumber = 0,
  prefix = '',
  suffix = '',
  decimalPlaces = 0,
  className,
  style,
}: CountingNumberProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const motionVal = useMotionValue(fromNumber)
  const springVal = useSpring(motionVal, { stiffness: 60, damping: 30 })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  React.useEffect(() => {
    if (isInView) {
      motionVal.set(number)
    }
  }, [isInView, number, motionVal])

  React.useEffect(() => {
    const unsubscribe = springVal.on('change', latest => {
      if (ref.current) {
        const formatted = decimalPlaces > 0 ? latest.toFixed(decimalPlaces) : Math.round(latest).toString()
        ref.current.textContent = `${prefix}${formatted}${suffix}`
      }
    })
    return () => unsubscribe()
  }, [springVal, decimalPlaces, prefix, suffix])

  return (
    <span ref={ref} className={className} style={style}>
      {`${prefix}${fromNumber}${suffix}`}
    </span>
  )
}
