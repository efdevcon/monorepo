import React, { useImperativeHandle } from 'react'
import css from './sts.module.scss'
import { useDrag } from 'react-use-gesture'
import useDimensions from 'react-cool-dimensions'

type SwipeToScrollProps = {
  noBounds?: boolean
  focusRef?: React.RefObject<HTMLElement>
  children: React.ReactChild | React.ReactChild[]
  scrollIndicatorDirections?: {
    ['left']?: boolean
    ['right']?: boolean
  }
  alwaysShowscrollIndicators?: boolean
  slideControls?: any
}

const SwipeToScroll = (props: SwipeToScrollProps) => {
  const el = React.useRef<HTMLDivElement | null>()
  const containerEl = React.useRef<HTMLDivElement | null>(null)
  const [maxScroll, setMaxScroll] = React.useState(0)
  const [isNativeScroll, setIsNativeScroll] = React.useState(true)
  const [scrollIndicatorClass, setScrollIndicatorClass] = React.useState('')
  const lastX = React.useRef(0)
  const maxScrollRef = React.useRef<number>(0)
  const isNativeScrollRef = React.useRef<any>(false)
  const onXChangeCallback = React.useRef<any>(null)
  const xAnimationLocked = React.useRef(false)

  maxScrollRef.current = maxScroll
  isNativeScrollRef.current = isNativeScroll

  // Whether or not to display a scroll indicator
  const syncScrollIndicators = React.useCallback(
    (scrollContainer: HTMLDivElement) => {
      const threshold = 5 // Add a threshold for when a container is "barely" scrollable - if its just a few pixels then it feels weird to have the indicator there
      let showIndicatorRight = false
      let showIndicatorLeft = false
      const leftEnabled = !!props.scrollIndicatorDirections?.left
      const rightEnabled = !!props.scrollIndicatorDirections?.right

      // On mobile we use native scrolling for better UX - as a result, the logic for whether or not we show scroll indicators also changes:
      if (isNativeScroll) {
        const canScrollRightNative =
          scrollContainer.scrollLeft < scrollContainer.scrollWidth - scrollContainer.clientWidth - threshold
        const canScrollLeftNative = scrollContainer.scrollLeft > threshold

        showIndicatorRight = canScrollRightNative && rightEnabled
        showIndicatorLeft = canScrollLeftNative && leftEnabled
      } else {
        const canScrollRight = lastX.current < maxScroll - threshold
        const canScrollLeft = lastX.current > threshold

        showIndicatorRight = canScrollRight && rightEnabled
        showIndicatorLeft = canScrollLeft && leftEnabled
      }

      const canScroll = scrollContainer.scrollWidth > scrollContainer.clientWidth + threshold

      if (showIndicatorLeft && showIndicatorRight) {
        setScrollIndicatorClass(css['mask-both'])
      } else if (showIndicatorRight) {
        setScrollIndicatorClass(css['mask-right'])
      } else if (showIndicatorLeft) {
        setScrollIndicatorClass(css['mask-left'])
      } else {
        setScrollIndicatorClass('')
      }

      // We have a case where we want to always show the scroll indicator in a direction regardless of whether or not we are fully scrolled:
      if (props.alwaysShowscrollIndicators) {
        if (leftEnabled && rightEnabled) {
          setScrollIndicatorClass(css['mask-both'])
        } else if (rightEnabled) {
          setScrollIndicatorClass(css['mask-right'])
        } else if (leftEnabled) {
          setScrollIndicatorClass(css['mask-left'])
        }

        return
      }

      if (!canScroll) {
        setScrollIndicatorClass('')
      }
    },
    [maxScroll, props.alwaysShowscrollIndicators, props.scrollIndicatorDirections, isNativeScroll]
  )

  const reset = React.useCallback(() => {
    if (el.current) {
      const scrollContainer = el.current
      lastX.current = 0
      if (onXChangeCallback.current && !isNativeScrollRef.current) onXChangeCallback.current(lastX.current)
      scrollContainer.style.transform = `translateX(0px)`
      syncScrollIndicators(scrollContainer)
    }
  }, [syncScrollIndicators])

  // When element changes size, record its max scroll boundary and reset all scroll related state to avoid edge cases
  const { observe } = useDimensions({
    onResize: ({ width }) => {
      const isNativeScroll = !window.matchMedia('not all and (hover: none)').matches

      setIsNativeScroll(isNativeScroll)

      reset()

      if (el.current && el.current.scrollWidth) {
        const maxScroll = el.current.scrollWidth - width

        setMaxScroll(maxScroll)
      }
    },
  })

  // When window changes size, reset
  React.useEffect(() => {
    const resizeListener = reset

    window.addEventListener('resize', resizeListener)

    return () => {
      window.removeEventListener('resize', resizeListener)
    }
  }, [reset])

  if (props.slideControls) {
    // eslint-disable-next-line
    useImperativeHandle(
      props.slideControls,
      () => {
        return {
          lastX,
          maxScrollRef,
          setX: (x: any) => {
            if (xAnimationLocked.current) return

            const scrollContainer = el.current!

            if (isNativeScrollRef.current) {
              scrollContainer.scrollTo({
                left: x,
                top: 0,
                behavior: 'smooth', // This enables smooth scrolling
              })

              return
            }

            lastX.current = Math.min(Math.max(x, 0), maxScrollRef.current)
            scrollContainer.style.transform = `translateX(-${lastX.current}px)`
            scrollContainer.style.transition = `all 0.8s ease-out`
            xAnimationLocked.current = true

            setTimeout(() => {
              scrollContainer.style.transition = `none`
              xAnimationLocked.current = false
            }, 800)

            if (onXChangeCallback.current && !isNativeScrollRef.current) onXChangeCallback.current(lastX.current)
          },
          subscribeX: (callback: any) => {
            onXChangeCallback.current = callback
          },
        }
      },
      []
    )
  }

  const bind = useDrag(({ down, delta }) => {
    const scrollContainer = el.current!

    lastX.current = Math.min(Math.max(0, lastX.current - delta[0]), maxScroll)
    if (onXChangeCallback.current && !isNativeScrollRef.current) onXChangeCallback.current(lastX.current)
    scrollContainer.style.transform = `translateX(-${lastX.current}px)`

    if (down) {
      containerEl.current!.style.cursor = 'grabbing'
    } else {
      containerEl.current!.style.cursor = 'auto'
    }
  })

  let className = `${css['container']}`

  if (scrollIndicatorClass) className += ` ${scrollIndicatorClass}`
  if (props.noBounds) className += ` ${css['no-bounds']}`

  let scrollContainerClass = css['swipe-to-scroll']

  if (isNativeScroll) scrollContainerClass += ` ${css['is-native-scroll']}`

  return (
    <div {...bind()} ref={containerEl} className={className} data-type="swipe-to-scroll-container">
      <div
        ref={element => {
          el.current = element!
          observe(element)
        }}
        className={scrollContainerClass}
        // This prevents selection (text, image) while dragging
        onMouseDown={e => {
          e.preventDefault()
        }}
        onScroll={(e: any) => {
          if (onXChangeCallback.current) onXChangeCallback.current(e.target.scrollLeft)
        }}
      >
        {props.children}
      </div>
    </div>
  )
}

export default SwipeToScroll
