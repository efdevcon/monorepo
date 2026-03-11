import { useRef, useState, useCallback, useEffect } from 'react'

const SWIPE_THRESHOLD = 60
const TAP_THRESHOLD = 8
const isTouchDevice = () => typeof window !== 'undefined' && 'ontouchstart' in window

export function useCardSwipe(cardCount: number) {
  const [frontIndex, setFrontIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [exitingIndex, setExitingIndex] = useState<number | null>(null)

  const isDragging = useRef(false)
  const startX = useRef(0)
  const dragOffset = useRef(0)
  const draggedEl = useRef<HTMLElement | null>(null)
  const pointerId = useRef<number | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isAnimating) return

      const el = e.currentTarget as HTMLElement

      isDragging.current = true
      startX.current = e.clientX
      dragOffset.current = 0
      draggedEl.current = el
      pointerId.current = e.pointerId

      // Capture pointer so we get all move/up events even if finger leaves the element
      el.setPointerCapture(e.pointerId)

      // Disable CSS transitions while dragging
      el.style.transition = 'none'
    },
    [isAnimating]
  )

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current || !draggedEl.current) return
      if (pointerId.current !== null && e.pointerId !== pointerId.current) return

      dragOffset.current = e.clientX - startX.current

      const progress = Math.min(Math.abs(dragOffset.current) / SWIPE_THRESHOLD, 1)
      const scale = 1 - progress * 0.05
      const rotation = (dragOffset.current / SWIPE_THRESHOLD) * 8

      draggedEl.current.style.transform = `translateX(${dragOffset.current}px) scale(${scale}) rotateY(${rotation}deg)`
    }

    const handleUp = (e: PointerEvent) => {
      if (!isDragging.current || !draggedEl.current) return
      if (pointerId.current !== null && e.pointerId !== pointerId.current) return

      const el = draggedEl.current
      const offset = dragOffset.current
      const shouldCycle = Math.abs(offset) > SWIPE_THRESHOLD
      const direction = offset < 0 ? 'left' : 'right'

      // Release pointer capture
      if (pointerId.current !== null) {
        try { el.releasePointerCapture(pointerId.current) } catch {}
      }

      // Restore CSS transitions
      el.style.transition = ''
      el.style.transform = ''

      isDragging.current = false
      dragOffset.current = 0
      draggedEl.current = null
      pointerId.current = null

      const isTap = Math.abs(offset) < TAP_THRESHOLD

      if (shouldCycle || isTap) {
        setIsAnimating(true)
        setExitDirection(isTap ? 'right' : direction)
        setExitingIndex(frontIndex)
        setFrontIndex(prev => (prev + 1) % cardCount)

        const duration = isTouchDevice() ? 850 : 350
        setTimeout(() => {
          setExitDirection(null)
          setExitingIndex(null)
          setIsAnimating(false)
        }, duration)
      }
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    document.addEventListener('pointercancel', handleUp)

    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      document.removeEventListener('pointercancel', handleUp)
    }
  }, [frontIndex, cardCount])

  return {
    frontIndex,
    isAnimating,
    exitDirection,
    exitingIndex,
    handlePointerDown,
  }
}
