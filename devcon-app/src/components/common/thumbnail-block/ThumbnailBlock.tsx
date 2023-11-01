import Image from 'next/image'
import React from 'react'
import css from './thumbnail-block.module.scss'
import { getTrackImage, getTrackID } from 'components/domain/index/track-list/TrackList'
import { Link } from 'components/common/link'

type ThumbnailBlock = {
  children: any
  className?: string
  track?: string
  unoptimized?: boolean
  thumbnail?: any
  thumbnailAlt?: string
  thumbnailUrl?: string
  thumbnailSubtext?: string
  onMouseEnter?: any
  scalePercentages?: boolean
}

export const ThumbnailBlock = (props: ThumbnailBlock) => {
  let className = css['container']

  if (props.className) className += ` ${props.className}`
  if (props.scalePercentages) className += ` ${css['scale-percentages']}`

  if (props.thumbnailSubtext) className += ` ${css['with-subtext']}`

  const trackID = getTrackID(props.track)

  if (trackID) className += ` ${css[trackID]}`

  const thumbnailSubtext = (() => {
    if (props.thumbnailSubtext) {
      return (
        <p className={css['thumbnail-text']}>
          {props.thumbnailSubtext.toLowerCase() === 'cryptoeconomics' ? 'Crypto-economics' : props.thumbnailSubtext}
        </p>
      )
    }

    return null
  })()

  const thumbnail = (() => {
    if (trackID && props.thumbnailUrl) {
      return (
        <Link to={props.thumbnailUrl} data-type="thumbnail-block-image" className={css['thumbnail-container']}>
          {getTrackImage(trackID, css['thumbnail-svg'])}
          {thumbnailSubtext}
        </Link>
      )
    }

    if (props.thumbnail) {
      return (
        <div data-type="thumbnail-block-image" className={css['thumbnail-container']}>
          <Image
            unoptimized={props.unoptimized} // Have to do this for images hosted on domains we don't know beforehand
            src={props.thumbnail}
            width="56"
            height="56"
            alt={props.track || props.thumbnailAlt || 'thumbnail'}
          />
          {thumbnailSubtext}
        </div>
      )
    }

    return null
  })()

  return (
    <div className={className} onMouseEnter={props.onMouseEnter}>
      {thumbnail}
      <div data-type="thumbnail-block-content" className={css['children']}>
        {props.children}
      </div>
    </div>
  )
}
