import React, { useEffect, useLayoutEffect, useState } from 'react'

const isBrowser = typeof window !== 'undefined'
const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect

export const useIsScrolled = () => {
  const [isScrolled, setIsScrolled] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 0 // Reading scrollY causes repaint; keep an eye out for perf issues

      setIsScrolled(scrolled)
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return isScrolled
}


export const useScrollY = () => {
  const [y, setY] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const handleScroll = () => {
      setY(window.scrollY > 0);
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return y;
}

export const useDidScrollDown = () => {
  const [didScrollDown, setDidScrolledDown] = React.useState(false)
  const lastScrollDistance = React.useRef(0)

  useIsomorphicLayoutEffect(() => {
    const handleScroll = () => {
      const currentScrollDistance = window.scrollY

      const scrolledDown = currentScrollDistance > lastScrollDistance.current && currentScrollDistance > 0

      if (scrolledDown) {
        if (!didScrollDown) {
          setDidScrolledDown(true)
        }
      } else {
        if (didScrollDown) {
          setDidScrolledDown(false)
        }
      }

      lastScrollDistance.current = currentScrollDistance
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [didScrollDown])

  return didScrollDown;
}