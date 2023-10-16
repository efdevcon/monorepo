import React from 'react'
import css from './list.module.scss'

interface Item {
  id: number | string
  title: string | React.ReactChild
  body: string | React.ReactChild
  indent?: boolean
  active?: boolean
  disabled?: boolean
}

interface ListProps {
  items: Item[]
  withSeparators?: boolean
  connectedItems?: boolean
}

const List = (props: ListProps) => {
  let className = css['list']

  if (props.withSeparators) className += ` ${css['with-separators']}`
  if (props.connectedItems) className += ` ${css['connected']}`

  return (
    <ul className={className}>
      {props.items.map((item: Item, index: number) => {
        let className = css['item']

        if (item.active) className += ` ${css['active']}`
        if (item.disabled) className += ` ${css['disabled']}`

        return (
          <li className={className} key={item.id}>
            <span className={css['number']}>
              {/* <span className={css['number-inner']}> */}
              <span>{index + 1}</span>
              {/* </span> */}
            </span>
            <div className={css['content']}>
              <div className={`${css['title']} font-xl`}>{item.title}</div>
              <div className={css['body']}>{item.body}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default List
