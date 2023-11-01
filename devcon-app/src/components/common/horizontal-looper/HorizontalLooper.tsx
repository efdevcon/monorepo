import React from 'react'
import css from './horizontal-looper.module.scss'

const HorizontalLooper = (props: any) => {
  let className = css['marquee']

  if (props.slow) className += ` ${css['slow']}`
  if (props.unpadded) className += ` ${css['unpadded']}`

  return (
    <div className={css['wrap']}>
      <div className={className}>
        {props.children}
        {props.children}
      </div>
    </div>
  )
}

export default HorizontalLooper
