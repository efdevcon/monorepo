import React from 'react'
import { useBlogs } from 'src/hooks/useBlogs'
import moment from 'moment'
import css from './blog-reel.module.scss'
import { Card } from '../../common/card'
import { BlogPost } from 'src/types/BlogPost'
import { Slider, useSlider } from 'src/components/common/slider'

export function BlogReel() {
  const blogs: BlogPost[] = [] // useBlogs(props.maxItems) - NOT USED ON Archive

  const settings = {
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    arrows: false,
    touchThreshold: 100,
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
    <div className="section">
      <div className="content margin-top">
        <div className={`${css['cards']} border-top`}>
          <Slider sliderProps={sliderProps} title="Blog">
            {blogs.map((blog: BlogPost, i: number) => {
              let className = css['card']

              if (i === blogs.length - 1) className += ` ${css['last']}`

              return (
                <Card
                  className={className}
                  slide={sliderProps[1].canSlide}
                  key={blog.slug}
                  title={blog.title}
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
      </div>
    </div>
  )
}
