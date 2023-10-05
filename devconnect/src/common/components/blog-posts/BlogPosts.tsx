import React from 'react'
import css from './blog-posts.module.scss'
import { Card } from 'common/components/card'
import { BlogPost } from 'types/BlogPost'
import { Slider, useSlider } from 'common/components/slider'
import moment from 'moment'

interface Props {
  blogs: Array<BlogPost>
}

export function BlogReel(props: Props) {
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
      <Slider sliderProps={sliderProps} title="Devcon Blog">
        {props.blogs.map((blog: BlogPost, i: number) => {
          let className = css['card']

          if (i === props.blogs.length - 1) className += ` ${css['last']}`

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
