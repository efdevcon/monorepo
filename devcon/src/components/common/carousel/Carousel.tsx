import React from 'react'
import css from './carousel.module.scss'
import Image from 'next/image'

type CarouselProps = {
  title?: string
  noAnimation?: boolean
  images: {
    src: any
    alt: string
  }[]
}

export function Carousel(props: CarouselProps) {
  let imagesClassName = css['images']

  if (props.noAnimation) {
    imagesClassName += ` ${css['no-animation']}`
  }

  return (
    <div className={css['container']}>
      <div className="section">
        <h3>{props.title}</h3>
      </div>

      {/* TO-DO: Use next/image - couldn't get it working; goal is to set a fixed height and having width be decided by the intrinsic size of the image */}
      <div className={imagesClassName}>
        {props.images.map((image, index) => {
          return <Image key={index + 'first'} src={image.src} alt={image.alt} />
        })}
        {props.images.map((image, index) => {
          return <Image key={index + 'second'} src={image.src} alt={image.alt} />
        })}
      </div>
    </div>
  )
}
