import React from 'react'
// Typescript blows up if react-slick types are installed (seems typescript starts respecting slicks internal @types/react instead of our own installed version?), so we just ts-ignore as a bandaid
// @ts-ignore
import SlickSlider from 'react-slick'
import css from './slider.module.scss'

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

type SliderProps = {
  sliderProps: any
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
      <div className={`${props.className} ${css['children']}`}>
        <SlickSlider ref={sliderState.sliderRef} {...settings}>
          {props.children}
        </SlickSlider>
      </div>
    </div>
  )
}
