import { useRef, useState, useCallback, useEffect } from 'react'

const SWIPE_THRESHOLD = 100

export function useCardSwipe(cardCount: number) {
  const [frontIndex, setFrontIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [exitingIndex, setExitingIndex] = useState<number | null>(null)

  const isDragging = useRef(false)
  const startX = useRef(0)
  const dragOffset = useRef(0)
  const draggedEl = useRef<HTMLElement | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isAnimating) return

      isDragging.current = true
      startX.current = e.clientX
      dragOffset.current = 0
      draggedEl.current = e.currentTarget as HTMLElement

      // Disable CSS transitions while dragging
      draggedEl.current.style.transition = 'none'
    },
    [isAnimating]
  )

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current || !draggedEl.current) return

      dragOffset.current = e.clientX - startX.current

      const progress = Math.min(Math.abs(dragOffset.current) / SWIPE_THRESHOLD, 1)
      const scale = 1 - progress * 0.05
      const rotation = (dragOffset.current / SWIPE_THRESHOLD) * 8

      draggedEl.current.style.transform = `translateX(${dragOffset.current}px) scale(${scale}) rotateY(${rotation}deg)`
    }

    const handleUp = () => {
      if (!isDragging.current || !draggedEl.current) return

      const el = draggedEl.current
      const offset = dragOffset.current
      const shouldCycle = Math.abs(offset) > SWIPE_THRESHOLD
      const direction = offset < 0 ? 'left' : 'right'

      // Restore CSS transitions
      el.style.transition = ''
      el.style.transform = ''

      isDragging.current = false
      dragOffset.current = 0
      draggedEl.current = null

      if (shouldCycle) {
        setIsAnimating(true)
        setExitDirection(direction)
        setExitingIndex(frontIndex)

        setTimeout(() => {
          setFrontIndex(prev => (prev + 1) % cardCount)
          setExitDirection(null)
          setExitingIndex(null)
          setIsAnimating(false)
        }, 350)
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
