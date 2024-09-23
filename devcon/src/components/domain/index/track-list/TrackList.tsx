import React from 'react'
import css from './track-list.module.scss'
import ImageNew from 'next/image'
import { Track } from 'types/Track'
import { Slider, useSlider } from 'components/common/slider'
import { FlipCard } from 'components/common/flip-card'
import RichText from 'lib/components/tina-cms/RichText'
import cn from 'classnames'

interface Props {
  tracks: Track[]
  title?: string
}

const settings = {
  infinite: true,
  touchThreshold: 100,
  speed: 500,
  variableWidth: true,
  arrows: false,
  swipeToSlide: true,
  mobileFirst: true,
}

const Tracks = (props: Props) => {
  const sliderProps = useSlider(settings)
  const tracks = props.tracks

  return (
    <div className={`${css['container']}`} id="tracks">
      <div className={css['tracks']}>
        <Slider sliderProps={sliderProps} title={props.title || 'Track Playlists'}>
          {tracks.map((track: any, i: number) => {
            let className = css['card']
            className += ` ${css['thailand-' + track.id]}`

              return (
                <FlipCard key={track.id} className={className} to={track.url || undefined}>
                  <div className="flex flex-col p-4 relative h-full select-none">
                    <div className={css['title']}>{track.title}</div>

                    <div className="relative grow">
                      <ImageNew
                        draggable="false"
                        className="object-contain p-4 select-none"
                        fill
                        src={track.logo}
                        alt={track.title}
                      />
                    </div>
                  </div>
                  <div className={cn(css['details'], 'flex flex-col justify-between')}>
                    <div className={css['title']}>{track.title}</div>
                    <div className={cn(css['text'], 'grow')}>
                      {/* @ts-ignore */}
                      <RichText content={track.body} />
                    </div>

                    {track.tags && (
                      <div className={`flex gap-1 flex-wrap mt-8`}>
                        {track.tags.split(',').map((tag: string) => {
                          return (
                            <div className="label rounded-lg !py-0.5" key={tag}>
                              {tag}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
              </FlipCard>
            )
          })}
        </Slider>
      </div>
    </div>
  )
}

export default Tracks
