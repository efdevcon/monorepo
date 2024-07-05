import React from 'react'
import css from './snapshot.module.scss'

type SnapshotItem = {
  id?: string | number
  Icon: any
  title: string | React.ReactElement
  left?: string
  right: string | React.ReactElement
}

type SnapshotProps = {
  items: SnapshotItem[]
}

/* 
  If we keep using this component it could probably use a less restrictive interface/allow for more customizability/flexibility of item rendering, no time atm
*/
export function Snapshot(props: SnapshotProps) {
  return (
    <div className={css['container']}>
      <ul className={css['list']}>
        {props.items.map((item: SnapshotItem) => {
          return (
            <li
              data-type="snapshot-item text-base"
              className={css['list-item']}
              key={typeof item.title === 'string' ? item.title : item.id}
            >
              <item.Icon />
              <span className={css['label']}>{item.title}</span>
              <span>{item.left}</span>
              {typeof item.right === 'string' ? <span className="bold">{item.right}</span> : item.right}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
