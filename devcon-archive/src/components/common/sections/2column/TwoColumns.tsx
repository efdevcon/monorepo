import React from 'react'
import css from './two-columns.module.scss'

type TwoColumnsProps = {
  id: string
  title?: string
  left: string | React.ReactNode
  right: string | React.ReactNode
  grow?: 'left' | 'right'
}

export const TwoColumns = (props: TwoColumnsProps) => {
  const leftClassName = props.grow === 'left' ? 'left-2x' : 'left'
  const rightClassName = props.grow === 'right' ? 'right-2x' : 'right'
  const sectionClassName = props.id === 'about' ? 'section-about' : 'section'

  return (
    <section id={props.id} className={`${css[sectionClassName]} markdown`}>
      {props.title && <h3 className="subsection-header">{props.title}</h3>}

      <div className={css['container']}>
        <div className={css[leftClassName]}>
          {typeof props.left === 'string' && <p dangerouslySetInnerHTML={{ __html: props.left }} />}
          {typeof props.left === 'object' && props.left}
        </div>
        <div className={css[rightClassName]}>
          {typeof props.right === 'string' && <p dangerouslySetInnerHTML={{ __html: props.right }} />}
          {typeof props.right === 'object' && props.right}
        </div>
      </div>
    </section>
  )
}
