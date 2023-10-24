import React from 'react'
import Github from 'src/assets/icons/github.svg'
import css from './contribute.module.scss'
import { Link } from 'src/components/common/link'
import { Contributor } from 'src/types/dip'
import { Tooltip } from 'src/components/common/tooltip'
import { useIntl } from 'gatsby-plugin-intl'
import { chunkArray } from 'src/utils/chunk-array'

type ContributeProps = {
  contributors: Array<Contributor>
  dipDescription: any
}

type ThumbnailProps = {
  contributor: Contributor
}

const Thumbnail = ({ contributor }: ThumbnailProps) => {
  return (
    <Tooltip content={contributor.name}>
      <img
        key={contributor.name}
        className={css['thumbnail']}
        alt={`Contributor: ${contributor.name}`}
        src={contributor.avatarUrl}
      />
    </Tooltip>
  )
}

/*
  TO FIX: on safari the animated tracks "flash" when they reset their animation (happens every 50 seconds so not that significant)
*/
const AutoScroller = (props: { contributors: Array<Contributor> }) => {
  const [containerSize, setContainerSize] = React.useState(0)
  const cleanupRef = React.useRef<any>()

  const setRef = React.useCallback(node => {
    if (cleanupRef.current) cleanupRef.current()
    if (!node) return

    const el = node

    if (window.ResizeObserver) {
      const observer = new window.ResizeObserver(entries => {
        const entry = entries[0]

        let size

        if (entry.contentBoxSize) {
          const borderBoxSize = entry.borderBoxSize[0] || entry.borderBoxSize
          size = borderBoxSize.inlineSize
        } else {
          size = entry.contentRect.width
        }

        setContainerSize(size)
      })

      observer.observe(el)

      cleanupRef.current = () => {
        observer.unobserve(el)
      }
    } else {
      const syncTrackSize = () => {
        const { width } = el.getBoundingClientRect()

        setContainerSize(width)
      }

      syncTrackSize()

      window.addEventListener('resize', syncTrackSize)

      cleanupRef.current = () => {
        window.removeEventListener('resize', syncTrackSize)
      }
    }
  }, [])

  const maxThumbnailsInView = 6
  const nRows = 3

  let containerClass = css['scroll-container']

  const chunkedContributors = chunkArray(props.contributors, nRows)

  return (
    <div
      key={containerSize === 0 ? 'loading' : containerSize} // Remounting the element when containerSize changes solves a lot of safari edge cases by resetting the CSS animations
      ref={setRef}
      className={containerClass}
      style={{
        '--container-size': `${containerSize}px`,
      }}
    >
      {chunkedContributors.map((contributors, index) => {
        const isOdd = index % 2 !== 0

        let className = css['track']

        if (containerSize) className += ` ${css['animate']}` // Have to wait with animating until containerSize is determined - bugs out in Safari otherwise
        if (isOdd) className += ` ${css['odd']} ${css['reverse']}`

        return (
          <div key={index} className={className}>
            {contributors.map(contributor => {
              return <Thumbnail key={contributor.name} contributor={contributor} />
            })}
            {/* Have to repeat some thumbnails to give the illusion of infinite loop */}
            {contributors.slice(0, maxThumbnailsInView).map(contributor => {
              return <Thumbnail key={contributor.name} contributor={contributor} />
            })}
          </div>
        )
      })}
    </div>
  )
}

export const Contribute = (props: ContributeProps) => {
  const intl = useIntl()

  return (
    <section id="contribute" className={css['section']}>
      <h3 className="spaced">{intl.formatMessage({ id: 'dips_contribute' })}</h3>

      <div className={css['container']}>
        <div className={css['left-section']}>
          <div
            dangerouslySetInnerHTML={{ __html: props.dipDescription }}
            className={`${css['dip-description']} markdown`}
          />
          <div className={css['links']}>
            <Link to="https://forum.devcon.org" indicateExternal className="text-uppercase font-lg bold font-secondary">
              {intl.formatMessage({ id: 'dips_visit_forum' })}
            </Link>
            <Link to="https://forum.devcon.org" indicateExternal className="text-uppercase font-lg bold font-secondary">
              {intl.formatMessage({ id: 'dips_create_proposal' })}
            </Link>
          </div>
        </div>
        <div className={css['contributors']}>
          <AutoScroller contributors={props.contributors} />
          <div className={css['info']}>
            <p>* {intl.formatMessage({ id: 'dips_contributors' })}</p> <Github />
          </div>
        </div>
      </div>
    </section>
  )
}
