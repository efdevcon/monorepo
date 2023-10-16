import React from 'react'
import { Link } from 'components/common/link'
import css from './button.module.scss'

export const Button = React.forwardRef((props: any, ref: any) => {
  const buttonRef = React.useRef<HTMLDivElement>()
  const [x, setX] = React.useState(0)
  const [y, setY] = React.useState(0)

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (buttonRef.current === undefined) return

    var rect = e.currentTarget.getBoundingClientRect()
    var x = e.clientX - rect.left // x position within the element.
    var y = e.clientY - rect.top // y position within the element.

    setX(x)
    setY(y)
  }

  let style = props.style
  let className = `${css['button']} animated`

  if (props.className) {
    className = `${className} ${props.className}`
  }

  if (x | y) {
    style = {
      ...props.style,
      '--mouse-x': x,
      '--mouse-y': y,
    }
  }

  const formattedProps = {
    ref: (el: HTMLDivElement) => {
      buttonRef.current = el
      if (ref) ref.current = el
    },
    ...props,
    className: className,
    onMouseMove: onMouseMove,
    onMouseLeave: () => {
      setX(0)
      setY(0)
    },
    style,
  }

  const children = (
    <>
      <span className={css['background']}></span>
      <span className={css['text']}>{props.children}</span>
    </>
  )

  if (props.to) {
    let linkClassName = `${formattedProps.className} button`

    if (props.disabled) linkClassName += ` disabled`

    return (
      <Link {...formattedProps} className={linkClassName}>
        {children}
      </Link>
    )
  }

  return <button {...formattedProps}>{children}</button>
})
