import React, { useState } from 'react'
import css from './flip-card.module.scss'

export const FlipCard = (props: any) => {
  let className = css['card']

  if (props.className) className += ` ${props.className}`

  return (
    <div className={className}>
      <div className={css['content']}>
        <div className={css['front']} data-type="flip-card-front">
          {props.children[0]}
        </div>
        <div className={css['back']} data-type="flip-card-back">
          {props.children[1]}
        </div>
      </div>
    </div>
  )
}
