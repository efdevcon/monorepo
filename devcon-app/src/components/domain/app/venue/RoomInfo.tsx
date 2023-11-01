import React from 'react'
import { Room as RoomType } from 'types/Room'
import IconMarker from 'assets/icons/icon_marker.svg'
import css from './roominfo.module.scss'
import { Link } from 'components/common/link'
import { defaultSlugify } from 'utils/formatting'
import { useIsStandalone } from 'utils/pwa-link'

interface Props {
  room: RoomType
  noLink?: boolean
  noIndicator?: boolean
  align?: boolean
  className?: string
}

export const RoomInfo = (props: Props) => {
  const isStandalone = useIsStandalone()
  let className = `${css['container']} ${css[defaultSlugify(props.room.description)]}`
  if (props.className) className += ` ${props.className}`
  if (props.align) className += ` ${css['align']}`

  return (
    <div className={className}>
      {!props.noIndicator && <IconMarker />}

      {!props.noLink && (
        <Link to={isStandalone ? `/venue?room=${props.room.id}` : `/venue/${props.room.id}`}>
          <strong>{props.room.name}</strong>
          <span className={css['default']}>{props.room.description && ` — ${props.room.description}`}</span>
        </Link>
      )}

      {props.noLink && (
        <p>
          {props.room.name}
          {props.room.description && ` — ${props.room.description}`}
        </p>
      )}
    </div>
  )
}
