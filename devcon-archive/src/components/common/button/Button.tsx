import React from 'react'
import { Link } from 'src/components/common/link'
import css from './button.module.scss'

export const Button = (props: any) => {
  const buttonRef = React.useRef<HTMLDivElement>()
  const [x, setX] = React.useState(0)
  const [y, setY] = React.useState(0)

  const onMouseMove = (e: React.SyntheticEvent) => {
    if (buttonRef.current === undefined) return

    var rect = e.target.getBoundingClientRect()
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
    ref: buttonRef,
    ...props,
    className: className,
    onMouseMove: onMouseMove,
    onMouseLeave: () => {
      setX(0)
      setY(0)
    },
    style,
  }

  // Some fun project when time allows: make buttons optionally flicker to bring attention to themselves :-)
  // React.useEffect(() => {
  //   if (props.flicker && x === 0) {
  //     let frame: number
  //     let timeout: NodeJS.Timeout

  //     const step = () => {
  //       setXFlicker(prev => {
  //         const next = prev + 2

  //         if (next < 100) {
  //           frame = requestAnimationFrame(step)
  //         } else {
  //           timeout = setTimeout(() => {
  //             setXFlicker(0)
  //             frame = requestAnimationFrame(step)
  //           }, 2000)
  //         }

  //         return next
  //       })
  //     }

  //     frame = requestAnimationFrame(step)

  //     return () => {
  //       typeof frame !== undefined && cancelAnimationFrame(frame)
  //       clearTimeout(timeout)
  //     }
  //   }
  // }, [props.flicker, x])

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
}
