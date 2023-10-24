import React, { useState } from 'react'
import css from './alert.module.scss'
import { useIntl } from 'gatsby-plugin-intl'

import IconCircleCheck from 'src/assets/icons/circle_check.svg'
import IconCircleExclamation from 'src/assets/icons/circle_exclamation.svg'
import IconTriangleExclamation from 'src/assets/icons/triangle_exclamation.svg'
import IconCross from 'src/assets/icons/cross.svg'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'light'
  title?: string
  message?: string
  dismissable?: boolean
  dismissed?: () => void
}

export function Alert(props: AlertProps) {
  const intl = useIntl()
  const [visible, setVisible] = useState(true)

  const renderTitle = () => {
    if (props.title) return props.title

    switch (props.type) {
      case 'success':
        return intl.formatMessage({ id: 'state_success' })
      case 'error':
        return intl.formatMessage({ id: 'state_error' })
      case 'warning':
        return intl.formatMessage({ id: 'state_warning' })
      case 'info':
        return intl.formatMessage({ id: 'state_info' })
      default:
        return intl.formatMessage({ id: 'state_alert' })
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
