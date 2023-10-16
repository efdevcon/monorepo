import React from 'react'
import css from './gallery.module.scss'
import ArrowLeft from 'assets/icons/chevron_left.svg'
import ArrowRight from 'assets/icons/chevron_right.svg'

type GalleryProps = {
  children: React.ReactChild[]
  className?: string
  onChange?: (slideIndex: number) => void
}

export const Gallery = (props: GalleryProps) => {
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0)

  let className = css['gallery']

  if (props.className) className += ` ${props.className}`

  const showLeftNav = currentSlideIndex > 0
  const showRightNav = React.Children.count(props.children) - 1 > currentSlideIndex

  const createSetSlide = (nextSlideIndex: number) => () => {
    setCurrentSlideIndex(nextSlideIndex)
    if (props.onChange) props.onChange(nextSlideIndex)
  }

  const goPrevSlide = createSetSlide(currentSlideIndex - 1)
  const goNextSlide = createSetSlide(currentSlideIndex + 1)

  return (
    <div className={className}>
      <div className="aspect">
        {React.Children.map(props.children, (child, index) => {
          const selected = currentSlideIndex === index
          const isPrev = currentSlideIndex - 1 === index
          const isNext = currentSlideIndex + 1 === index

          let className = css['gallery-item']

          if (selected) className += ` ${css['selected']}`
          if (isPrev) className += ` ${css['']} ${css['prev']}`
          if (isNext) className += ` ${css['next']}`

          return <div className={className}>{child}</div>
        })}
      </div>

      {showLeftNav && (
        <button className={`${css['button']} plain ${css['left']}`} onClick={goPrevSlide}>
          <ArrowLeft />
        </button>
      )}
      {showRightNav && (
        <button className={`${css['button']} plain ${css['right']}`} onClick={goNextSlide}>
          <ArrowRight />
        </button>
      )}
    </div>
  )
}
