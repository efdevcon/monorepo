import React from 'react'
import moment from 'moment'
import css from './cls.module.scss'
import { Card } from '../../../common/card'
import { Slider, useSlider } from 'components/common/slider'

interface Props {
  sessions: Array<any>
}

export function CLSReel(props: Props) {
  const settings = {
    infinite: false,
    touchThreshold: 100,
    speed: 500,
    slidesToShow: 3,
    arrows: false,
    // slidesToScroll: 3,
    swipeToSlide: true,
    mobileFirst: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2.1,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1.1,
        },
      },
    ],
  }

  const sliderProps = useSlider(settings)

  return (
    <div className={`${css['cards']}`}>
      <Slider sliderProps={sliderProps} title="Featured Sessions">
        {props.sessions.map((blog: any, i: number) => {
          let className = `${css['card']} !rounded-xl`

          if (i === props.sessions.length - 1) className += ` ${css['last']}`

          return (
            <Card
              className={className}
              slide={sliderProps[1].canSlide}
              key={blog.slug}
              title={blog.title}
              description={blog.description}
              imageUrl={blog.imageUrl}
              expandLink
              linkUrl={blog.permaLink} // Linking to blog domain temporarily until blog page is done (static-phase)
              metadata={[moment(blog.date).format('ll'), blog.author]}
              allowDrag
            />
          )
        })}
      </Slider>
    </div>
  )
}
