import React from 'react'
import Image from 'next/legacy/image'
import ImageNew from 'next/image'
import css from './hero.module.scss'
import { Header } from 'pages/index'

type HeroProps = {
  imageProps?: {
    src: any
    alt: string
  }
  autoHeight?: boolean
  children: React.ReactNode
  className?: string
  backgroundClassName?: string
  backgroundTitle?: string
  backgroundStyle?: 'fill' | 'partial'
}

const Hero = (props: HeroProps) => {
  let className = css['hero']

  if (props.className) className += ` ${props.className}`
  if (props.backgroundStyle === 'fill') className += ` ${css['hide-bg-mobile']}`

  return (
    <div className={className}>
      <Header active />
      <div className={props.backgroundClassName || css['background']} />
      {props.imageProps && props.backgroundStyle === 'fill' && (
        <div data-type="background" className={css['background-fill']}>
          <ImageNew {...props.imageProps} />
        </div>
      )}

      <div className={`${css['content']} section`}>
        {/* {props.backgroundTitle && (
          <p className={`background-title clear-vertical !justify-end !items-end`}>{props.backgroundTitle}</p>
        )} */}
        <div
          className={`${css['children']} ${
            props.autoHeight ? css['auto-height'] : ' '
          } clear-vertical !justify-end !items-end min-h-[200px]`}
        >
          {props.children}
        </div>

        {props.imageProps && props.backgroundStyle !== 'fill' && (
          <div className={css['image']}>
            <div className={css['image-inner']}>
              <Image {...props.imageProps} layout="fill" objectFit="cover" priority />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Hero
