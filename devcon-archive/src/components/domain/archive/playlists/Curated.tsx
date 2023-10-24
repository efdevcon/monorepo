import React from 'react'
// import Slider from 'react-slick'
import css from './curated.module.scss'
import { BasicCard } from 'src/components/common/card'
import { Button } from 'src/components/common/button'
import { Playlist } from 'src/types/Playlist'
import ArrowRight from 'src/assets/icons/arrow_right.svg'
import { Slider, useSlider } from 'src/components/common/slider'
import { GatsbyImage, getImage } from 'gatsby-plugin-image'

type PlaylistProps = {
  title: string
  borderless?: boolean
  viewMore?: boolean
  items: Array<Playlist>
}

export const PlaylistCard = (props: { playlist: Playlist; canSlide: boolean; small?: boolean }) => {
  let className = `${css['video-card']} ${css['big']}`

  if (props.canSlide) className += ` ${css['slide']}`

  return (
    <BasicCard key={props.playlist.id} className={className} allowDrag linkUrl={props.playlist.slug} expandLink>
      <div className={`aspect ${props.small ? '' : 'square'}`}>
        {/* <img
          src={props.playlist.imageUrl}
          alt={`${props.playlist.title} Devcon playlist`}
          placeholder="blurred"
          className={css['image']}
        /> */}
        <GatsbyImage
          image={getImage(props.playlist.image)}
          alt={`${props.playlist.title} Devcon playlist`}
          className={css['image']}
        />
      </div>
      <div className={css['body']}>
        <div className="label">{props.playlist.videoCount ?? 0} talks</div>
        <h4 className="title">{props.playlist.title}</h4>
        {props.playlist.curators && props.playlist.curators.length > 0 && (
          <p className="bold font-xs">
            <span className={css['opaque']}>BY</span> {props.playlist.curators.join(', ').toUpperCase()}
          </p>
        )}
      </div>
    </BasicCard>
  )
}

export const CuratedPlaylists = (props: PlaylistProps) => {
  const nItems = props.items.length

  const sliderSettings = {
    infinite: false,
    speed: 500,
    slidesToShow: Math.min(nItems, 4),
    arrows: false,
    touchThreshold: 100,
    mobileFirst: true,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(nItems, 2),
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: Math.min(nItems, 1.1),
        },
      },
    ],
  }

  const sliderProps = useSlider(sliderSettings)

  return (
    <div className="section">
      <div className="content">
        <div className={`${css['curated-playlists']} ${props.borderless ? '' : 'border-top'} margin-bottom`}>
          <Slider
            sliderProps={sliderProps}
            className={css['slider']}
            style={props.borderless ? { marginTop: '0px' } : undefined}
            title={props.title}
          >
            {props.items.map((i: Playlist) => {
              return <PlaylistCard key={i.id} playlist={i} canSlide={sliderProps[1].canSlide} />
            })}
          </Slider>

          {props.viewMore && (
            <Button to={'/archive/playlists'} className={`${css['button']} white ghost sm`}>
              View more <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
