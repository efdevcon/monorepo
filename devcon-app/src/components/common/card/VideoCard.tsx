import React from 'react'
import css from './video-card.module.scss'
import { BasicCard } from 'components/common/card'
import { ArchiveVideo } from 'types/ArchiveVideo'
import { Playlist } from 'types/Playlist'
import { getVideoId } from 'utils/video'
import moment from 'moment'
import Image from 'next/image'

interface Props {
  video: ArchiveVideo
  playlist?: Playlist
  showDescription?: boolean
  className?: string
  slide?: Boolean
  horizontal?: boolean
  canSlide?: boolean
  vertical?: boolean
  compact?: boolean
}

export const VideoCard = (props: Props) => {
  let className = css['video-card']

  if (props.slide) className += ` ${css['slide']}`
  if (props.horizontal) className = css['horizontal']
  if (props.compact) className = css['compact']
  if (props.className) className += ` ${props.className}`

  function getWatchUrl() {
    let url = `${props.video.slug}`

    if (props.playlist) {
      url += `?playlist=${props.playlist.title}`
    }

    return url
  }

  return (
    <BasicCard className={className} slide={props.canSlide} expandLink linkUrl={getWatchUrl()} allowDrag>
      {/* Need the wrapper so we can constrain the aspect div */}
      <div className={css['aspect-wrapper']}>
        <div className="aspect">
          <Image
            src={`https://img.youtube.com/vi/${getVideoId(props.video.youtubeUrl)}/hqdefault.jpg`}
            alt={`${props.video.title} preview`}
            layout="fill"
            objectFit="cover"
          />

          <div className={`${css['labels']}`}>
            <div className={`label sm black`}>Devcon {props.video.edition}</div>
            <div className={`label sm black`}>{props.video.type}</div>
            {props.video.duration && (
              <div className={`${css['duration']} label sm black`}>
                {moment
                  .utc(props.video.duration * 1000)
                  .format('H:mm:ss')
                  .replace(/^0:/, '')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={css['body']}>
        <div className={css['top']}>
          <p className={css['title']}>{props.video.title}</p>
          <p className={css['description']}>{props.video.description}</p>
          {/* {props.showDescription && <p className={css['description']}>{props.video.description}</p>} */}
        </div>

        <div className={css['bottom']}>
          <div>{props.video.speakers && <p className={`${css['speakers']}`}>{props.video.speakers.join(', ')}</p>}</div>
        </div>
      </div>
    </BasicCard>
  )
}
