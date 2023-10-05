import React from 'react'
import css from './alert.module.scss'
import CloseIcon from 'assets/icons/cross.svg'
import AlertIcon from 'assets/icons/alert.svg'

type AlertProps = {
  title: string
  className?: string
  children: React.ReactNode
  color?: 'orange' | 'blue'
}

const Alert = (props: AlertProps) => {
  // const [alertHidden, setAlertHidden] = React.useState(false)
  let className = css['alert']

  className += ` ${css[props.color || 'blue']}`

  if (props.className) className += ` ${props.className}`

  // if (alertHidden) return null

  const body = (
    <div className={className}>
      {props.title && (
        <div className={css['title']}>
          <AlertIcon />
          <p>{props.title}</p>
        </div>
      )}
      <div className={css['body']}>{props.children}</div>
      {/* <div className={css['close']} onClick={() => setAlertHidden(true)}>
        <CloseIcon />
      </div> */}
    </div>
  )

  return body
}

export default Alert
