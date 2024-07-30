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
  tracks?: Track[]
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

export const DC6_TRACKS = [
  {
    id: 'layer-1',
    archiveSlug: 'Layer%201%20Protocol',
    title: 'Layer 1 Protocol',
    body: 'Ethereum Roadmap, core protocol upgrades and improvements, design decisions and tradeoffs, core protocol values and their importance.',
    image: <Layer1 />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-layer-1-protocol/',
  },
  {
    id: 'layer-2s',
    archiveSlug: 'Layer%202s',
    title: 'Layer 2s',
    body: "Pushing Ethereum's boundaries: more throughput, a farther reach, and more functionality. What are ways to enable Ethereum to scale, handle transactions faster, and for building bridges with other technologies? Anything rollup-related, wallets and other L2-enabling technologies, applications that take advantage of them, etc.",
    image: <Layer2 />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-layer-2s/',
  },
  {
    id: 'developer-infrastructure',
    archiveSlug: 'Developer%20Infrastructure',
    title: 'Developer Infrastructure',
    body: 'Tooling and other efforts to make it easier, more fun, and more appealing to build on Ethereum. Languages, libraries, frameworks, dev tooling, best practices, etc.',
    image: <DeveloperInfra />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-developer-infrastructure/',
  },
  {
    id: 'governance-coordination',
    archiveSlug: 'Governance%20%26%20Coordination',
    title: 'Governance & Coordination',
    body: 'How can we empower people to coordinate, manage common resources and make positive-sum decisions together? DAOs, decentralized governance, etc.',
    image: <Governance />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-governance-and-coordination/',
  },
  {
    id: 'ux-design',
    archiveSlug: 'UX%20%26%20Design',
    title: 'UX & Design',
    body: 'Let’s create a more intuitive, safe and delightful experience for users of Ethereum and its applications! Design, UI, product-market fit, marketing, etc.',
    image: <UXDesign />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-ux-and-design/',
  },
  {
    id: 'staking-validator-experience',
    archiveSlug: 'Staking%20%26%20Validator%20Experience',
    title: 'Staking & Validator Experience',
    body: 'Home staking, distributed validator technology, pooling, decentralization improvements, protocol design, and everything in between.',
    image: <Staking />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-staking-and-validator-experience/',
  },
  {
    id: 'security',
    archiveSlug: 'Security',    
    title: 'Security',
    body: 'Making Ethereum easy, safe, and more secure for end-users. DApp security, data privacy, identity, key management, etc.',
    image: <Security />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-security/',
  },
  {
    id: 'zkps',
    archiveSlug: 'ZKPs%3A%20Privacy%2C%20Identity%2C%20Infrastructure%2C%20%26%20More',
    title: 'ZKPs: Privacy, Identity, Infrastructure, & More',
    body: 'The potential of zero knowledge cryptography and its applications to privacy, digital identity, decentralized systems, and more.',
    image: <ZKPs />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-zkps-privacy-identity-infrastructure-and-more/'
  },
  {
    id: 'opportunity-global-impact',
    archiveSlug: 'Opportunity%20%26%20Global%20Impact',
    title: 'Opportunity & Global Impact',
    body: 'How can Ethereum change the world for the better? Public goods, sustainability, politics, P2P finance, impact of NFTs, micro-lending, financial systems, identity, emerging markets, environment, communication and censorship, access, etc.',
    image: <GlobalImpact />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-opportunity-and-global-impact/'
  },
  {
    id: 'cryptoeconomics',
    archiveSlug: 'Cryptoeconomics',
    title: 'Cryptoeconomics',
    body: 'Research in MEV, game theory, mechanism design and tokenomics for protocols and applications.',
    image: <Cryptoeconomics />,
    url : 'https://archive.devcon.org/archive/playlists/devcon-6-cryptoeconomics/'
  },
]

export function getTrackImage(trackID: string, className: string) {
  return DC6_TRACKS.find((track: any) => track.id === trackID)?.image
}


const Tracks = (props: Props) => {
  const sliderProps = useSlider(settings)
  const tracks = props.tracks || DC6_TRACKS

  return (
    <div className={`${css['container']}`} id="tracks">
      <div className={css['tracks']}>
        <Slider sliderProps={sliderProps} title={props.title || 'Track Playlists'}>
          {tracks.map((track: any, i: number) => {
            let className = css['card']

            if (props.isThailand) {
              className += ` ${css['thailand-' + track.id]}`
            } else {
              className += ` ${css[track.id]}`
            }

            if (props.isThailand) {
              return (
                <FlipCard key={track.id} className={className}>
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
            }

            return (
              <FlipCard key={track.id} className={className} to={track.url}>
                <div className={css['image']}>{track.image}</div>
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
