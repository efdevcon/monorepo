import React from 'react'
import css from './message.module.scss'
import MessageIcon from 'assets/icons/message.svg'

type MessageProps = {
  title: string
  children: React.ReactNode
  color?: 'orange' | 'blue'
}

export const Message = (props: MessageProps) => {
  let className = css['message']

  className += ` ${css[props.color || 'blue']}`

  return (
    <div className={className}>
      <div className={css['title']}>
        <MessageIcon />
        <p>{props.title}</p>
      </div>
      <div className={css['body']}>{props.children}</div>
    </div>
  )
}
