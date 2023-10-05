import React from 'react'
import Link from 'common/components/link'
import Image from 'next/image'
// import { GetExcerpt } from 'utils/formatting'
import css from './card.module.scss'
import IconArrowRight from 'assets/icons/arrow_right.svg'

interface CardProps {
  title: string
  titleAsIcon?: React.ReactElement
  description?: string
  imageUrl?: any
  linkUrl?: string
  expandLink?: boolean
  date?: Date
  metadata?: string[]
  customReadMore?: string
  className?: string
  slide?: boolean
  allowDrag?: boolean
  children?: React.ReactNode
}

interface BasicCardProps {
  expandLink?: boolean
  linkUrl?: string
  imageUrl?: string
  className?: string
  slide?: boolean
  allowDrag?: boolean
  children?: React.ReactNode
}

// Card has too many variations to be encapsulated by the default Card export
// For places where we need more customization, you can import BasicCard instead of Card and fill in the contents yourself
export const BasicCard = React.forwardRef((props: BasicCardProps, ref: any) => {
  let className = css['card']

  if (props.className) className = `${className} ${props.className}`
  if (props.slide) className = ` ${className} ${css['slide']}`

  if (props.expandLink && props.linkUrl) {
    return (
      <Link className={className} href={props.linkUrl} ref={ref} allowDrag={props.allowDrag}>
        {props.children}
      </Link>
    )
  }

  return (
    <div className={className} ref={ref}>
      {props.children}
    </div>
  )
})

export const Card = React.forwardRef((props: CardProps, ref: any) => {
  // const intl = useTranslations()

  const link =
    props.expandLink || !props.linkUrl ? (
      props.titleAsIcon || props.title
    ) : (
      <Link className="hover-underline" href={props.linkUrl}>
        {props.titleAsIcon || props.title}
      </Link>
    )

  const readMore =
    props.expandLink || !props.linkUrl ? (
      <div className={css['read-more']}>
        <p>Read More</p>
        <IconArrowRight />
      </div>
    ) : (
      <Link href={props.linkUrl} className={css['read-more']}>
        <>
          <p>Read More</p>
          <IconArrowRight />
        </>
      </Link>
    )

  const image = (() => {
    if (!props.imageUrl) return null

    const isOptimized = typeof props.imageUrl !== 'string'

    if (isOptimized) {
      return (
        <div className="aspect">
          <div className={css['img-wrapper']}>
            <Image className={css['img']} src={props.imageUrl} alt={props.title} />
          </div>
        </div>
      )
    }

    return (
      <div className="aspect">
        <div className={css['img-wrapper']}>
          <Image
            alt={props.title}
            className={`${css['img']} ${css['not-gatsby']}`}
            src={props.imageUrl}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 40vw"
          />
        </div>
      </div>
    )
  })()

  let bodyClass = css['body']

  if (props.linkUrl) bodyClass += ` ${css['with-link']}`

  const cardContent = (
    <>
      {image}

      <div className={bodyClass}>
        <p className={css['title']}>{link}</p>
        {props.description && (
          <p
            className={css['text']}
            dangerouslySetInnerHTML={{ __html: props.description /* GetExcerpt(props.description)*/ }}
          />
        )}

        <div className={css['bottom-section']}>
          {props.metadata && (
            <div className={css['metadata']}>
              {props.metadata.map((text, index) => (
                <small key={props.title + '_' + index}>{text}</small>
              ))}
            </div>
          )}

          {props.linkUrl && readMore}
        </div>
      </div>
    </>
  )

  let className = ''

  if (props.expandLink) className = `${css['expand-link']} ${className}`
  if (props.imageUrl) className = `${className} ${css['img']}`

  return (
    <BasicCard className={className} {...props} ref={ref}>
      {cardContent}
    </BasicCard>
  )
})
