import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Draw-to-sign pad for attachment fields. Pointer events cover finger, mouse,
// trackpad and pen alike; strokes are kept in CSS pixels so a resize (phone
// rotation, panel reflow) redraws them instead of wiping the canvas. Each time
// a stroke ends the drawing is exported as a PNG File through `onChange`; the
// owner decides when to upload it. `onChange(null)` means the pad was cleared.

export interface SignaturePadHandle {
  /** Wipe the pad. Emits `onChange(null)` unless `silent`. */
  clear: (opts?: { silent?: boolean }) => void
}

interface SignaturePadProps {
  onChange: (file: File | null) => void
  disabled?: boolean
  ariaLabel: string
  /** Filename of the exported PNG. */
  filename?: string
}

type Point = { x: number; y: number }

const PAD_HEIGHT = 160
const STROKE_COLOR = '#160b2b'
const STROKE_WIDTH = 2.5
// Export at a fixed 2x so the stored image is crisp regardless of device DPR.
const EXPORT_SCALE = 2

function traceStroke(ctx: CanvasRenderingContext2D, stroke: Point[]) {
  if (stroke.length === 0) return
  ctx.beginPath()
  if (stroke.length === 1) {
    // A tap: draw a dot so a single press still leaves a mark.
    ctx.arc(stroke[0].x, stroke[0].y, STROKE_WIDTH / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.moveTo(stroke[0].x, stroke[0].y)
  // Quadratic curves through the midpoints smooth the jagged raw pointer path.
  for (let i = 1; i < stroke.length - 1; i++) {
    const midX = (stroke[i].x + stroke[i + 1].x) / 2
    const midY = (stroke[i].y + stroke[i + 1].y) / 2
    ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, midX, midY)
  }
  const last = stroke[stroke.length - 1]
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

function paint(ctx: CanvasRenderingContext2D, strokes: Point[][], scale: number, background?: string) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  }
  ctx.scale(scale, scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = STROKE_WIDTH
  ctx.strokeStyle = STROKE_COLOR
  ctx.fillStyle = STROKE_COLOR
  for (const stroke of strokes) traceStroke(ctx, stroke)
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onChange, disabled = false, ariaLabel, filename = 'signature.png' },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Point[][]>([])
  const drawingRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [hasInk, setHasInk] = useState(false)

  // Redraw everything, batched to one paint per frame while the pointer moves.
  const scheduleRedraw = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const dpr = window.devicePixelRatio || 1
      paint(ctx, strokesRef.current, dpr)
    })
  }, [])

  // Size the bitmap to the rendered box (× DPR) and repaint on every resize.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width * dpr))
      const height = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      scheduleRedraw()
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [scheduleRedraw])

  const exportPng = useCallback((): Promise<File | null> => {
    const canvas = canvasRef.current
    if (!canvas || strokesRef.current.length === 0) return Promise.resolve(null)
    const rect = canvas.getBoundingClientRect()
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(rect.width * EXPORT_SCALE))
    out.height = Math.max(1, Math.round(rect.height * EXPORT_SCALE))
    const ctx = out.getContext('2d')
    if (!ctx) return Promise.resolve(null)
    // Opaque white so the signature reads on any background in NocoDB.
    paint(ctx, strokesRef.current, EXPORT_SCALE, '#ffffff')
    return new Promise(resolve => {
      out.toBlob(blob => {
        resolve(blob ? new File([blob], filename, { type: 'image/png' }) : null)
      }, 'image/png')
    })
  }, [filename])

  const emitChange = useCallback(() => {
    exportPng().then(file => onChangeRef.current(file))
  }, [exportPng])

  const clear = useCallback(
    (opts?: { silent?: boolean }) => {
      strokesRef.current = []
      drawingRef.current = false
      setHasInk(false)
      scheduleRedraw()
      if (!opts?.silent) onChangeRef.current(null)
    },
    [scheduleRedraw]
  )

  useImperativeHandle(ref, () => ({ clear }), [clear])

  const pointFromEvent = (e: { clientX: number; clientY: number }): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    strokesRef.current.push([pointFromEvent(e)])
    setHasInk(true)
    scheduleRedraw()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !e.isPrimary) return
    e.preventDefault()
    const stroke = strokesRef.current[strokesRef.current.length - 1]
    // Coalesced events give the full high-frequency path on devices that batch
    // pointer moves per frame, so fast strokes don't come out as polygons.
    const native = e.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] }
    const events = native.getCoalescedEvents ? native.getCoalescedEvents() : []
    if (events.length > 0) {
      for (const ev of events) stroke.push(pointFromEvent(ev))
    } else {
      stroke.push(pointFromEvent(e))
    }
    scheduleRedraw()
  }

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    scheduleRedraw()
    emitChange()
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-lg border border-[#dddae2] bg-white ${
          disabled ? 'opacity-50' : ''
        }`}
        style={{ height: PAD_HEIGHT }}
      >
        {/* Baseline the way a paper form has one — purely decorative. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-4 right-4 border-t border-dashed border-[#dddae2]"
          style={{ top: '70%' }}
        />
        {!hasInk && (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#594d73]"
          >
            Sign here
          </p>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          className="block h-full w-full select-none"
          style={{ touchAction: 'none', cursor: disabled ? 'not-allowed' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onContextMenu={e => e.preventDefault()}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-[#594d73]">
        <span>Draw with your finger, mouse or trackpad.</span>
        <button
          type="button"
          onClick={() => clear()}
          disabled={disabled || !hasInk}
          className="shrink-0 text-sm font-medium text-[#7235ed] hover:underline disabled:text-[#594d73] disabled:no-underline disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  )
})
