import { useMemo } from 'react'

export default () => {
  const isTouchDevice = useMemo(() => {
    if (typeof window !== 'undefined') return window.matchMedia('(hover: none)').matches

    return false
  }, [])

  return isTouchDevice
}