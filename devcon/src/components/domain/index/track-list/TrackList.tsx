import React from 'react'
import css from './track-list.module.scss'
import ImageNew from 'next/image'
import Layer1 from 'assets/images/tracks/big-icons/Layer 1 Protocol.svg'
import Cryptoeconomics from 'assets/images/tracks/big-icons/Cryptoeconomics.svg'
import DeveloperInfra from 'assets/images/tracks/big-icons/Developer Infrastructure.svg'
import Governance from 'assets/images/tracks/big-icons/Governance & Coordination.svg'
import Layer2 from 'assets/images/tracks/big-icons/Layer 2s.svg'
import GlobalImpact from 'assets/images/tracks/big-icons/Opportunity & Global Impact.svg'
import Security from 'assets/images/tracks/big-icons/Security.svg'
import Staking from 'assets/images/tracks/big-icons/Staking & Validator Experience.svg'
import UXDesign from 'assets/images/tracks/big-icons/UX & Design.svg'
import ZKPs from 'assets/images/tracks/big-icons/ZKPs and Privacy.svg'
import { Track } from 'types/Track'
import { Slider, useSlider } from 'components/common/slider'
import { FlipCard } from 'components/common/flip-card'
import RichText from 'lib/components/tina-cms/RichText'
import cn from 'classnames'

interface Props {
  isThailand?: boolean
  title?: string
  tracks: Track[]
}

const settings = {
  infinite: false,
  touchThreshold: 100,
  speed: 500,
  variableWidth: true,
  arrows: false,
  swipeToSlide: true,
  mobileFirst: true,
}

export const getTrackID = (trackName?: string) => {
  let trackID

  switch (trackName) {
    case 'Layer 1 Protocol': {
      trackID = 'layer-1'

      break
    }

    case 'Layer 2s': {
      trackID = 'layer-2s'

      break
    }

    case 'Governance & Coordination': {
      trackID = 'governance-coordination'

      break
    }

    case 'Developer Infrastructure': {
      trackID = 'developer-infrastructure'

      break
    }

    case 'Staking & Validator Experience': {
      trackID = 'staking-validator-experience'

      break
    }

    case 'ZKPs: Privacy, Identity, Infrastructure, & More': {
      trackID = 'zkps'

      break
    }

    case 'Security': {
      trackID = 'security'

      break
    }

    case 'Opportunity & Global Impact': {
      trackID = 'opportunity-global-impact'

      break
    }

    case 'Cryptoeconomics': {
      trackID = 'cryptoeconomics'

      break
    }

    case 'UX & Design':
      trackID = 'ux-design'

      break
  }

  return trackID
}

export function getTrackImage(id?: string, className?: string) {
  if (id === 'layer-1') return <Layer1 className={className} />
  if (id === 'layer-2s') return <Layer2 className={className} />
  if (id === 'developer-infrastructure') return <DeveloperInfra className={className} />
  if (id === 'governance-coordination') return <Governance className={className} />
  if (id === 'ux-design') return <UXDesign className={className} />
  if (id === 'staking-validator-experience') return <Staking className={className} />
  if (id === 'security') return <Security className={className} />
  if (id === 'zkps') return <ZKPs className={className} />
  if (id === 'opportunity-global-impact') return <GlobalImpact className={className} />
  if (id === 'cryptoeconomics') return <Cryptoeconomics className={className} />

  return null
}

const getArchiveSlug = (id?: string) => {
  if (id === 'layer-1') return 'Layer%201%20Protocol'
  if (id === 'layer-2s') return 'Layer%202s'
  if (id === 'developer-infrastructure') return 'Developer%20Infrastructure'
  if (id === 'governance-coordination') return 'Governance%20%26%20Coordination'
  if (id === 'ux-design') return 'UX%20%26%20Design'
  if (id === 'staking-validator-experience') return 'Staking%20%26%20Validator%20Experience'
  if (id === 'security') return 'Security'
  if (id === 'zkps') return 'ZKPs%3A%20Privacy%2C%20Identity%2C%20Infrastructure%2C%20%26%20More'
  if (id === 'opportunity-global-impact') return 'Opportunity%20%26%20Global%20Impact'
  if (id === 'cryptoeconomics') return 'Cryptoeconomics'
}

const Tracks = (props: Props) => {
  const sliderProps = useSlider(settings)

  return (
    <div className={`${css['container']}`} id="tracks">
      <div className={css['tracks']}>
        <Slider sliderProps={sliderProps} title={props.title || 'Track Playlists'}>
          {props.tracks.map((track: Track, i: number) => {
            let className = css['card']

            if (props.isThailand) {
              className += ` ${css['thailand-' + track.id]}`
            } else {
              className += ` ${css[track.id]}`
            }

            const archiveSlug = getArchiveSlug(track.id)
            const archiveUrl = archiveSlug
              ? `https://archive.devcon.org/archive/watch?order=desc&sort=edition&tags=${archiveSlug}`
              : undefined

            if (props.isThailand) {
              return (
                <FlipCard key={track.slug} className={className} to={archiveUrl}>
                  <div className="flex flex-col p-4 relative h-full select-none">
                    <div className={css['title']}>{track.title}</div>

                    <div className="relative grow">
                      <ImageNew className="object-contain p-4" fill src={track.logo} alt={track.title} />
                    </div>
                  </div>
                  <div className={cn(css['details'], 'flex flex-col justify-between')}>
                    <div className={css['title']}>{track.title}</div>
                    <div className={cn(css['text'], 'grow')}>
                      {/* @ts-ignore */}
                      <RichText content={track.body} />
                    </div>

                    {track.tags && (
                      <div className={`flex gap-2`}>
                        {track.tags.split(',').map((tag: string) => {
                          return (
                            <div className="label rounded-lg" key={tag}>
                              {tag}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </FlipCard>
              )
            }

            return (
              <FlipCard key={track.slug} className={className} to={archiveUrl}>
                <div className={css['image']}>{getTrackImage(track.id)}</div>
                <div className={css['details']}>
                  <div className={css['title']}>{track.title}</div>
                  <div className={css['text']}>{track.body}</div>
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
