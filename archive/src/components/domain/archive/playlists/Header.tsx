import React from 'react'
import IconWatch from 'src/assets/icons/watch.svg'
import { Playlist } from 'src/types/Playlist'
import css from './header.module.scss'
import { Link } from 'src/components/common/link'
import { GatsbyImage, getImage } from 'gatsby-plugin-image'

type Props = {
  playlist: Playlist
  className?: string
}

export function PlaylistHeader(props: Props) {
  let className = css['container']
  if (props.className) className += ` ${props.className}`

  const firstVideo = props.playlist.videos[0]

  return (
    <div className={className}>
      <div className={css['content-section']}>
        <div>
          <div className="label">{props.playlist.videoCount ?? 0} talks</div>
          <h2 className="title font-xxl">{props.playlist.title}</h2>
          <p className={`${css['description']} font-md-fixed`}>{props.playlist.description}</p>
        </div>

        <div>
          {firstVideo?.slug && (
            <Link
              className={css['controls']}
              to={`${firstVideo.slug}?playlist=${encodeURIComponent(props.playlist.title)}`}
            >
              <IconWatch /> <span className="bold font-xs">WATCH PLAYLIST</span>
            </Link>
          )}

          {props.playlist.curators && props.playlist.curators.length > 0 && (
            <>
              <p className="bold font-xs">
                <span className={css['opaque']}>CURATED BY:</span>
              </p>
              <p className="bold font-xs">{props.playlist.curators.join(', ').toUpperCase()}</p>
            </>
          )}
        </div>
      </div>

      <div className={css['image-section']}>
        {/* <img src={props.playlist.imageUrl} alt={`${props.playlist.title} Devcon playlist`} placeholder="blurred" /> */}
        <GatsbyImage image={getImage(props.playlist.image)} alt={`${props.playlist.title} Devcon playlist`} />
      </div>
    </div>
  )
}
