import { useState, useLayoutEffect, useEffect } from 'react'

const isBrowser = typeof window !== 'undefined'
const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect

const getElementHeight = (elementID: string) => {
  const element = document.getElementById(elementID)

  return element?.offsetHeight || 0
}

// Returns the height of an element by ID
// Assumes the target element is rendered
const useGetElementHeight = (elementID: string) => {
  const [elementHeight, setElementHeight] = useState(0)

  useIsomorphicLayoutEffect(() => {
    if (window.ResizeObserver) {
      const el = document.getElementById(elementID)

      if (!el) return

      const observer = new window.ResizeObserver(entries => {
        const entry = entries[0]

        if (entry.borderBoxSize) {
          const borderBoxSize = entry.borderBoxSize[0] || entry.borderBoxSize

          setElementHeight(borderBoxSize.blockSize)
        } else {
          setElementHeight(el.offsetHeight)
        }
      })

      observer.observe(el)

      return () => {
        observer.unobserve(el)
      }
    } else {
      const determineHeight = () => {
        const nextElementHeight = getElementHeight(elementID)

        if (nextElementHeight) setElementHeight(nextElementHeight)
      }

      // Set initial height (on component mount)
      determineHeight()

      // Keep height in sync when browser resizes
      window.addEventListener('resize', determineHeight)

      return () => {
        window.removeEventListener('resize', determineHeight)
      }
    }
  }, [elementID])

  return elementHeight
}

export default useGetElementHeight
