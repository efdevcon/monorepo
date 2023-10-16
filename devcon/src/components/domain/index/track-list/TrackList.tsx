import React from 'react'
import css from './track-list.module.scss'
import Accordion from 'components/common/accordion'
import Image from "next/legacy/image"
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
import TriangleBackground from 'assets/images/background-triangles.png'
import { Track } from 'types/Track'
import { Card } from 'components/common/card'
import { Slider, useSlider } from 'components/common/slider'
import { FlipCard } from 'components/common/flip-card'

interface Props {
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
  if (id === 'layer-2s') return 'Layer%202s';
  if (id === 'developer-infrastructure') return 'Developer%20Infrastructure';
  if (id === 'governance-coordination') return 'Governance%20%26%20Coordination';
  if (id === 'ux-design') return 'UX%20%26%20Design';
  if (id === 'staking-validator-experience') return 'Staking%20%26%20Validator%20Experience';
  if (id === 'security') return 'Security';
  if (id === 'zkps') return 'ZKPs%3A%20Privacy%2C%20Identity%2C%20Infrastructure%2C%20%26%20More';
  if (id === 'opportunity-global-impact') return 'Opportunity%20%26%20Global%20Impact';
  if (id === 'cryptoeconomics') return 'Cryptoeconomics';
}

const Tracks = (props: Props) => {
  const sliderProps = useSlider(settings)

  return (
    <div className={`section ${css['container']}`} id="tracks">
      <div className={`${css['background']} expand`}>
        <Image src={TriangleBackground} alt="Triangles" />
      </div>
      {/* <h2 className="border-top clear-top">Tracks</h2> */}

      <div className={css['tracks']}>
        <Slider sliderProps={sliderProps} title="Track Playlists">
          {props.tracks.map((track: Track, i: number) => {
            let className = css['card']

            className += ` ${css[track.id]}`

            return (
              <FlipCard key={track.slug} className={className} to={`https://archive.devcon.org/archive/watch?order=desc&sort=edition&tags=${getArchiveSlug(track.id)}`}>
                <div className={css['image']}>{getTrackImage(track.id)}</div>
                <div className={css['details']}>
                  <p className={css['title']}>{track.title}</p>
                  <p className={css['text']}>{track.body}</p>
                </div>
              </FlipCard>
            )
          })}
        </Slider>
      </div>
      {/* <Accordion
        dense
        items={props.tracks.map((i: Track) => {
          return {
            id: i.id,
            title: (
              <div className={css['track-title']}>
                <span className={css['icon-container']}>{getTrackImage(i.id)}</span>
                {i.title}
              </div>
            ),
            body: <div className={css['track-body']}>{i.body}</div>,
          }
        })}
      /> */}
    </div>
  )
}

export default Tracks
