import { useLayoutEffect, useState } from 'react'

export const useIsScrolled = () => {
  const [isScrolled, setIsScrolled] = useState(false)

  useLayoutEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 0 // Reading scrollY causes repaint; keep an eye out for perf issues

      setIsScrolled(scrolled)
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return isScrolled
}
