import React from 'react'
import Github from 'assets/icons/github.svg'
import css from './contribute.module.scss'
import { Link } from 'components/common/link'
import { Contributor } from 'types/DIP'
import { Tooltip } from 'components/common/tooltip'
import { useTranslations } from 'next-intl'
import { chunkArray } from 'utils/chunk-array'
import Image from 'next/legacy/image'
import { usePageContext } from 'context/page-context'
import RichText from 'lib/components/tina-cms/RichText'
import InfiniteScroller from 'lib/components/infinite-scroll'
import indexCss from 'pages/index.module.scss'

type ContributeProps = {
  contributors: Array<Contributor>
  dipDescription?: any
  communityHubs?: any
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
        width="100%"
        height="100%"
      />
      {/* <div className={css['thumbnail']}>
        <Image
          key={contributor.name}
          className={css['thumbnail']}
          alt={`Contributor: ${contributor.name}`}
          src={contributor.avatarUrl}
          width="100%"
          height="100%"
        />
      </div> */}
    </Tooltip>
  )
}

/*
  TO FIX: on safari the animated tracks "flash" when they reset their animation (happens every 50 seconds so not that significant)
*/
export const AutoScroller = (props: { contributors: Array<Contributor> }) => {
  const [containerSize, setContainerSize] = React.useState(0)
  const cleanupRef = React.useRef<any>()

  const setRef = React.useCallback((node: any) => {
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
      style={
        {
          '--container-size': `${containerSize}px`,
        } as any
      }
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
  const intl = useTranslations()
  const page = usePageContext()?.current

  return (
    <>
      <section id="contribute" className={css['section']}>
        <div className={`${css['container']} relative pb-8`}>
          <div className={css['left-section']}>
            <RichText content={props.dipDescription} />
          </div>

          <div className={css['contributors']}>
            <div className="my-2 md:my-4">
              <AutoScroller contributors={props.contributors} />
            </div>
            <div className={css['info']}>
              <p className="bold">*DIP Github Contributors</p> <Github />
            </div>
          </div>

          <div className={`${indexCss['scrolling-text-background']}`}>
            <InfiniteScroller nDuplications={2} speed="200s" reverse>
              <p className="bold uppercase">Devcon Improvement Proposals&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>

        <div className="mb-8 border-top pt-8" id="hubs">
          <RichText content={props.communityHubs} />
        </div>
      </section>
    </>
  )
}
