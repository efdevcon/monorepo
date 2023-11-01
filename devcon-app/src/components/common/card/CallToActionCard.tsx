import React from 'react'
import css from './call-to-action.module.scss'
import { Button } from '../button'
import { Link } from '../link'

type CallToActionProps = {
  title: string
  tag?: string
  children: any
  color?: 'orange' | 'purple' | 'blue'
  BackgroundSvg: React.ElementType
  link: any
  linkText: string
  meta: string
}

const CallToAction = (props: CallToActionProps) => {
  let className = css['message-card']
  let buttonColor = 'red'

  if (props.color) {
    className += ` ${css[props.color]}`
  }

  switch (props.color) {
    case 'purple': {
      buttonColor = 'purple'
    }

    case 'blue': {
      buttonColor = 'blue'
    }
  }

  return (
    <div className={className}>
      <div className={css['background']}>
        <props.BackgroundSvg />
      </div>

      <div className={css['header']}>
        <p className="h3">{props.title}</p>
        {props.tag && <div className={`label ${buttonColor} bold ${css['tag']} ghost`}>{props.tag}</div>}
      </div>

      {props.children}

      <div className={css['footer']}>
        <Link to={props.link}>
          <Button className={`${buttonColor} lg`}>{props.linkText}</Button>
        </Link>
        <p className="bold font-sm">{props.meta}</p>
      </div>
    </div>
  )
}

export default CallToAction
