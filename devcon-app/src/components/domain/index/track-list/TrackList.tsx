import React from 'react'
import css from './track-list.module.scss'
import Accordion from 'components/common/accordion'
import Image from 'next/image'
import Layer1 from 'assets/images/tracks/big-icons/Layer1.png'
import Cryptoeconomics from 'assets/images/tracks/big-icons/Cryptoeconomics.png'
import DeveloperInfra from 'assets/images/tracks/big-icons/Developer-Infrastructure.png'
import Governance from 'assets/images/tracks/big-icons/Governance-Coordination.png'
import Layer2 from 'assets/images/tracks/big-icons/Layer2.png'
import GlobalImpact from 'assets/images/tracks/big-icons/Opportunity-Global-Impact.png'
import Security from 'assets/images/tracks/big-icons/Security.png'
import Staking from 'assets/images/tracks/big-icons/Staking-Validator-Experience.png'
import UXDesign from 'assets/images/tracks/big-icons/UX-Design.png'
import ZKPs from 'assets/images/tracks/big-icons/ZKPs-Privacy.png'
import Activities from 'assets/images/tracks/big-icons/Activities.png'
// import TriangleBackground from 'assets/images/background-triangles.png'
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
  if (!trackName) return 'activities'

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
  if (id === 'layer-1') return <Image src={Layer1} alt="Layer 1" />
  if (id === 'layer-2s') return <Image src={Layer2} alt="Layer 2" />
  if (id === 'developer-infrastructure') return <Image src={DeveloperInfra} alt="Developer Infra" />
  if (id === 'governance-coordination') return <Image src={Governance} alt="Governance" />
  if (id === 'ux-design') return <Image src={UXDesign} alt="UX and Design" />
  if (id === 'staking-validator-experience') return <Image src={Staking} alt="Validator experience" />
  if (id === 'security') return <Image src={Security} alt="Security" />
  if (id === 'zkps') return <Image src={ZKPs} alt="ZKPs" />
  if (id === 'opportunity-global-impact') return <Image src={GlobalImpact} alt="Global impact" />
  if (id === 'cryptoeconomics') return <Image src={Cryptoeconomics} alt="Cryptoecon" />
  if (id === 'activities') return <Image src={Activities} alt="Activities" />

  return null
}

const Tracks = (props: Props) => {
  const sliderProps = useSlider(settings)

  return (
    <div className={`section ${css['container']}`} id="tracks">
      <div className={`${css['background']} expand`}>{/* <Image src={TriangleBackground} alt="Triangles" /> */}</div>
      {/* <h2 className="border-top clear-top">Tracks</h2> */}

      <div className={css['tracks']}>
        <Slider sliderProps={sliderProps} title="Tracks">
          {props.tracks.map((track: Track, i: number) => {
            let className = css['card']

            className += ` ${css[track.id]}`

            return (
              <FlipCard key={track.slug} className={className}>
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
