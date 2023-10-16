import React, { useState } from 'react'
import { Link } from '../link'
import css from './flip-card.module.scss'

type FlipCardProps = {
  to?: string
  className?: string,
  children: any
}

export const FlipCard = (props: FlipCardProps) => {
  let className = css['card']
  let body = (
    <div className={css['content']}>
      <div className={css['front']} data-type="flip-card-front">
        {props.children[0]}
      </div>
      <div className={css['back']} data-type="flip-card-back">
        {props.children[1]}
      </div>
    </div>
  )

  if (props.className) className += ` ${props.className}`

  if (props.to) {
    return (
      <Link to={props.to} className={className} allowDrag>{body}</Link>
    )
  }

  return (
    <div className={className}>
      {body}
    </div>
  )
}
