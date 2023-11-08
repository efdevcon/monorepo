import React, { useState } from 'react'
import { useDevconEditions } from 'src/hooks/useDevconEditions'
import moment from 'moment'
import css from './editions.module.scss'
import { DevconEdition } from 'src/types/DevconEdition'
import { Button } from 'src/components/common/button'
import OnDemandVideoIcon from 'src/assets/icons/on_demand_video.svg'
import PlaylistIcon from 'src/assets/icons/playlist.svg'
import { GatsbyImage, getImage } from 'gatsby-plugin-image'
import { HorizontalScroller } from 'src/components/common/horizontal-scroller'

interface Props {
  className?: string
}

const Clock = (props: any) => {
  const animationEl = React.useRef<any>()

  React.useEffect(() => {
    const handler = () => {
      props.next()
    }

    animationEl.current.addEventListener('animationend', handler)

    return () => {
      // TODO: Something messed up with react 18 upgrade here (warns about "falling back to react 17 behaviour" because of some gatsby internals using old apis) - need this check - won't spend too much energy on it since we'll be moving to nextjs anyway
      if (animationEl.current) {
        animationEl.current.removeEventListener('animationend', handler)
      }
    }
  }, [props.next])

  return (
    <div className={`${css['circle-wrap']}`}>
      <div className={`${css['circle']}`}>
        <div className={`${css['mask']} ${css['full']}`}>
          <div ref={animationEl} className={`${css['fill']}`}></div>
        </div>
        <div className={`${css['mask']} ${css['half']}`}>
          <div className={`${css['fill']}`}></div>
        </div>

        <div className={`${css['inside-circle']}`}>
          <div>{props.children}</div>
        </div>
      </div>
    </div>
  )
}

export const Editions = (props: Props) => {
  const editions = useDevconEditions()
  const [selectedEditionIndex, setSelectedEditionIndex] = useState(0)
  let className = `padding-bottom ${css['container']}`
  if (props.className) {
    className += ` ${props.className}`
  }

  const selectedEdition = editions[selectedEditionIndex]

  return (
    <div className="section">
      <div className="content">
        <h2 className={`bold font-xl font-primary padding-top border-top padding-bottom ${css['title']}`}>
          All Devcons
        </h2>
        <div className={className}>
          <HorizontalScroller>
            <div className={css['numbers']}>
              {editions.map((i: DevconEdition, index: number) => {
                const selected = i.number === selectedEdition.number
                let className = css['edition']

                if (selected) className += ` ${css['selected']}`

                return (
                  <div key={i.number} className={className}>
                    <p className={css['conference']}>Devcon Editions</p>

                    {selected ? (
                      <Clock
                        next={() => setSelectedEditionIndex(curr => (curr === editions.length - 1 ? 0 : curr + 1))}
                      >
                        {i.number}
                      </Clock>
                    ) : (
                      <button className={`${css['number']} plain`} onClick={() => setSelectedEditionIndex(index)}>
                        {i.number}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </HorizontalScroller>

          <div className={css['image-container']}>
            <div className="aspect square">
              {editions.map((i: DevconEdition, index: number) => {
                const nConstellations = 3
                const gridConstellation = (index % nConstellations) + 1
                let className = `${css['constellation-' + gridConstellation]} ${css['images']}`

                if (index === selectedEditionIndex) className += ` ${css['selected']}`

                return (
                  <div className={className} key={index}>
                    <div className={css['image-wrapper']}>
                      <GatsbyImage image={getImage(i.image1)} objectFit="cover" placeholder="black" alt={i.title} />
                    </div>

                    <div className={css['image-wrapper']}>
                      <GatsbyImage image={getImage(i.image2)} objectFit="cover" placeholder="black" alt={i.title} />
                    </div>

                    <div className={css['image-wrapper']}>
                      <GatsbyImage image={getImage(i.image3)} objectFit="cover" placeholder="black" alt={i.title} />
                    </div>

                    <div className={`${css['image-wrapper']} ${css['title']}`}>
                      <GatsbyImage image={getImage(i.imageTitle)} objectFit="contain" alt={i.title} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={css['info']} key={selectedEdition.title}>
            <div className={css['title']}>
              <p className="title">{selectedEdition.title}</p>
              <p className="subtitle">{selectedEdition.location}</p>
              {selectedEdition.startDate && selectedEdition.endDate ? (
                <p>
                  {moment.utc(selectedEdition.startDate).format('MMM DD')} -{' '}
                  {moment.utc(selectedEdition.endDate).format('MMM DD')},{' '}
                  {moment.utc(selectedEdition.endDate).format('YYYY')}
                </p>
              ) : (
                <p>2022 </p>
              )}
              {selectedEdition.title === 'Devcon VI' && <p>(Devcon Week: Oct 7 - Oct 16, 2022)</p>}
            </div>
            <div className={css['description']}>
              <p>{selectedEdition.description}</p>
            </div>
            <div className={css['buttons-container']}>
              <div className={css['buttons']}>
                {/* Only show watch now button after the event has started */}
                {moment().unix() > moment(selectedEdition.startDate).unix() && (
                  <Button
                    to={`/archive/watch?event=devcon-${selectedEdition.number}`}
                    className={`${css['button']} red ghost sm`}
                  >
                    Watch <OnDemandVideoIcon />
                  </Button>
                )}

                {selectedEdition.links.map(i => {
                  return (
                    <Button key={i.title} to={i.url} className={`${css['button']} white ghost sm`}>
                      {i.title}
                      {i.title.toLowerCase() === 'playlist' && (
                        <PlaylistIcon style={{ fontSize: '0.9em', marginTop: '2px' }} />
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div className={css['background-text']}>
              <p>Ethereum</p>
              <p>Developer</p>
              <p>Conference</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
