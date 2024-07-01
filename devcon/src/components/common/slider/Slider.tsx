import React from 'react'
import SlickSlider from 'react-slick'
import css from './slider.module.scss'
// import { Button } from 'components/common/button'
import ChevronLeft from 'assets/icons/arrow_left.svg'
import ChevronRight from 'assets/icons/arrow_right.svg'
import { motion } from 'framer-motion'
import { Button } from 'lib/components/button'
import cn from 'classnames'

export const useSlider = (settings: any) => {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [cardsPerSlide, setCardsPerSlide] = React.useState(0)
  const sliderRef = React.useRef<SlickSlider>()

  const nCards = (() => {
    var counter = 0

    if (sliderRef.current) {
      React.Children.forEach(sliderRef.current.props.children, function (child) {
        if (child) counter++
      })
    }

    return counter
  })()

  const canNext = currentIndex < nCards - cardsPerSlide
  const canBack = currentIndex > 0

  return [
    {
      ...settings,
      beforeChange: (_: any, next: number) => {
        if (setCurrentIndex) setCurrentIndex(next)
      },
      onReInit: () => {
        if (!sliderRef.current) return
        if (!settings.responsive) return

        const { state } = sliderRef.current as any

        const currentBreakpoint = state.breakpoint
        const breakpoints = settings.responsive

        const activeBreakpoint =
          breakpoints?.find(({ breakpoint }: any) => {
            return breakpoint === currentBreakpoint
          })?.settings || settings

        const nextCardsPerSlide = activeBreakpoint?.slidesToShow

        if (cardsPerSlide !== nextCardsPerSlide) setCardsPerSlide(nextCardsPerSlide)
      },
    },
    {
      currentIndex,
      cardsPerSlide,
      nCards,
      canNext,
      canBack,
      canSlide: canNext || canBack,
      setCurrentIndex,
      setCardsPerSlide,
      sliderRef,
    },
  ]
}

const Arrows = (props: any) => {
  let className = `border-2 w-[40px] h-[40px] border-solid ${css['arrow-button']}`

  const canNext = props.currentIndex < props.nCards - props.cardsPerSlide
  const canBack = props.currentIndex > 0

  if (!canNext && !canBack) return null

  return (
    <div className={cn(css['arrows'], 'shrink-0')}>
      <Button
        disabled={!canBack}
        circle
        className="border-2"
        aria-label="Slide left"
        onClick={() => props.sliderRef.current?.slickPrev()}
      >
        <ChevronLeft />
      </Button>
      <Button
        disabled={!canNext}
        circle
        className="border-2 ml-2"
        aria-label="Slide right"
        onClick={() => props.sliderRef.current?.slickNext()}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

type SliderProps = {
  sliderProps: any
  onlySlider?: boolean
  className?: string
  containerClassName?: string
  children?: React.ReactNode
  style?: {
    [key: string]: any
  }
  // custom?: () => React.ReactNode
  title?: string
}

export const Slider = (props: SliderProps) => {
  const [settings, sliderState] = props.sliderProps

  return (
    <div data-type="slider-container" className={`${props.containerClassName} ${css['container']}`} style={props.style}>
      {!props.onlySlider && (
        <div className={css['top-section']}>
          <h2 className="bold" data-type="slider-title">
            {props.title}
          </h2>

          <Arrows {...sliderState} />

          {/* <div className={css['controls']}>
          {props.custom && props.custom()}
          <Arrows {...sliderState} />
        </div> */}
        </div>
      )}

      <div className={`${props.className} ${css['children']}`}>
        {/*
        // @ts-ignore */}
        <SlickSlider ref={sliderState.sliderRef} {...settings}>
          {props.children}
        </SlickSlider>
      </div>
    </div>
  )
}
