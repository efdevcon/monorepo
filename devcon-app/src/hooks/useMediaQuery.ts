import { useState, useCallback, useEffect } from 'react'

export const useMediaQuery = (width: number): boolean => {
  const [targetReached, setTargetReached] = useState(false)

  const updateTarget = useCallback((e: any) => {
    if (e.matches) {
      setTargetReached(true)
    } else {
      setTargetReached(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(`(max-width:${width}px)`);
      media.addEventListener('change', e => updateTarget(e))

      if (media.matches) {
        setTargetReached(true)
      }

      return () => media.removeEventListener('change', e => updateTarget(e))
    }
  }, [])

  return targetReached
}
