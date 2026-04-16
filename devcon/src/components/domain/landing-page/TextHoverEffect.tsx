import { useRef, useState, useId, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'

export type GradientStop = {
  offset: string
  color: string
}

const defaultGradientStops: GradientStop[] = [
  { offset: '0%', color: '#eab308' },
  { offset: '25%', color: '#ef4444' },
  { offset: '50%', color: '#3b82f6' },
  { offset: '75%', color: '#07d5c7' },
  { offset: '100%', color: '#8b5cf6' },
]

export const TextHoverEffect = ({
  text,
  duration,
  strokeColor = '#e6e6e6',
  gradientStops = defaultGradientStops,
  fontFamily = 'Chloe, serif',
  fontWeight = 'normal',
  letterSpacing = -0.03,
  fontSize = '4.5rem',
  maskRadius = 20,
  viewBoxOverride,
}: {
  text: string
  duration?: number
  strokeColor?: string
  gradientStops?: GradientStop[]
  fontFamily?: string
  fontWeight?: string
  letterSpacing?: number
  fontSize?: string
  maskRadius?: number
  viewBoxOverride?: string
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [maskPosition, setMaskPosition] = useState({ cx: '50%', cy: '50%' })
  const id = useId()

  const viewBox = useMemo(() => {
    if (viewBoxOverride) return viewBoxOverride
    const charWidth = text.length <= 4 ? 60 : text.length <= 6 ? 45 : text.length <= 10 ? 30 : 22
    const width = Math.max(300, text.length * charWidth)
    return `0 0 ${width} 100`
  }, [text, viewBoxOverride])

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect()
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      })
    }
  }, [cursor])

  const gradientId = `textGradient-${id}`
  const maskId = `revealMask-${id}`
  const textMaskId = `textMask-${id}`

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={e => setCursor({ x: e.clientX, y: e.clientY })}
      className="select-none"
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse">
          {hovered &&
            gradientStops.map((stop, i) => <stop key={i} offset={stop.offset} stopColor={stop.color} />)}
        </linearGradient>

        <motion.radialGradient
          id={maskId}
          gradientUnits="userSpaceOnUse"
          r={`${maskRadius}%`}
          initial={{ cx: '50%', cy: '50%' }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: 'easeOut' }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id={textMaskId}>
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#${maskId})`} />
        </mask>
      </defs>
      <text
        x="50%"
        y="51%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        stroke={strokeColor}
        fill="transparent"
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        letterSpacing={`${letterSpacing}em`}
        style={{ opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>
      <motion.text
        x="50%"
        y="51%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        stroke={strokeColor}
        fill="transparent"
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        letterSpacing={`${letterSpacing}em`}
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: 'easeInOut',
        }}
      >
        {text}
      </motion.text>
      <text
        x="50%"
        y="51%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke={`url(#${gradientId})`}
        strokeWidth="0.3"
        mask={`url(#${textMaskId})`}
        fill="transparent"
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        letterSpacing={`${letterSpacing}em`}
      >
        {text}
      </text>
    </svg>
  )
}
