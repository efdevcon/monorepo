import React, { useState } from 'react'
import css from './alert.module.scss'
import { useTranslations } from 'next-intl'
import IconCircleCheck from 'assets/icons/circle_check.svg'
import IconCircleExclamation from 'assets/icons/circle_exclamation.svg'
import IconTriangleExclamation from 'assets/icons/triangle_exclamation.svg'
import IconCross from 'assets/icons/cross.svg'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'light'
  title?: string
  message?: string
  dismissable?: boolean
  dismissed?: () => void
}

export function Alert(props: AlertProps) {
  const intl = useTranslations()
  const [visible, setVisible] = useState(true)

  const renderTitle = () => {
    if (props.title) return props.title

    switch (props.type) {
      case 'success':
        return intl('state_success')
      case 'error':
        return intl('state_error')
      case 'warning':
        return intl('state_warning')
      case 'info':
        return intl('state_info')
      default:
        return intl('state_alert')
    }
  }

  const renderIcon = () => {
    switch (props.type) {
      case 'success':
        return <IconCircleCheck />
      case 'warning':
        return <IconTriangleExclamation />
      default:
        return <IconCircleExclamation />
    }
  }

  function dismiss() {
    setVisible(false)

    if (props.dismissed) {
      props.dismissed()
    }
  }

  if (!visible) return <></>

  return (
    <div className={css[props.type]}>
      <div>{renderIcon()}</div>
      <div className={css.message}>
        {props.dismissable && (
          <div className={css.right}>
            <span role="button" className={css.dismiss} aria-label="Dismiss alert" onClick={dismiss}>
              <IconCross />
            </span>
          </div>
        )}
        <p className={css.title}>{renderTitle()}</p>
        {props.message && <p>{props.message}</p>}
      </div>
    </div>
  )
}
