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
  /** Fires once, when the displayed value first reaches the target */
  onComplete?: () => void
}

export function CountingNumber({
  number,
  fromNumber = 0,
  prefix = '',
  suffix = '',
  decimalPlaces = 0,
  className,
  style,
  onComplete,
}: CountingNumberProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const completedRef = React.useRef(false)
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
      // The spring rests asymptotically and its last change event can land just
      // shy of the target (e.g. 699.4 → "699" forever) — snap once within half
      // a displayed unit.
      const settled = Math.abs(latest - number) < 0.5 / Math.pow(10, decimalPlaces)
      const value = settled ? number : latest
      if (ref.current) {
        const formatted = decimalPlaces > 0 ? value.toFixed(decimalPlaces) : Math.round(value).toString()
        ref.current.textContent = `${prefix}${formatted}${suffix}`
      }
      if (settled && !completedRef.current) {
        completedRef.current = true
        onComplete?.()
      }
    })
    return () => unsubscribe()
  }, [springVal, decimalPlaces, prefix, suffix, number, onComplete])

  return (
    <span ref={ref} className={className} style={style}>
      {`${prefix}${fromNumber}${suffix}`}
    </span>
  )
}
