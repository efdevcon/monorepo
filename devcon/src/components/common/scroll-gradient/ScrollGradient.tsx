import React from 'react'
import css from './scroll-gradient.module.scss'

type Props = {
  height: string
  [key: string]: any
}

export const ScrollGradient = (props: Props) => {
  const { height, ...rest } = props

  let className = css['wrapper']

  if (props.className) className += ` ${props.className}`

  return (
    <div {...rest} className={className} style={{ '--scroll-gradient-height': height || '100px' } as any}>
      {props.children}
    </div>
  )
}
