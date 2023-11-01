import React from 'react'
import { Room as RoomType } from 'types/Room'
import css from './roomlist.module.scss'
import { Link, LinkList } from 'components/common/link'
import { RoomInfo } from './RoomInfo'
import { useIsStandalone } from 'utils/pwa-link'

interface Props {
  rooms: RoomType[]
  className?: string
}

export const RoomList = (props: Props) => {
  const isStandalone = useIsStandalone()
  let className = `${css['container']}`
  if (props.className) className += ` ${props.className}`

  const sessionRooms = props.rooms.filter(i => i.capacity && i.capacity > 0)
  const otherRooms = props.rooms.filter(i => !i.capacity || i.capacity === 0)

  return (
    <div className={className}>
      {sessionRooms.length > 0 && (
        <div className="clear-bottom-less">
          <h6>Session Rooms</h6>
          <LinkList noIndicator>
            {sessionRooms.map((room: RoomType) => {
              return (
                <Link
                  className={`font-md ${css['floor-link']}`}
                  key={room.id}
                  to={isStandalone ? `/venue?room=${room.id}` : `/venue/${room.id}`}
                >
                  <RoomInfo room={room} />
                </Link>
              )
            })}
          </LinkList>
        </div>
      )}

      {otherRooms.length > 0 && (
        <div className="clear-bottom-less">
          <h6>Amenities &amp; Experiences</h6>
          <LinkList noIndicator>
            {otherRooms.map((room: RoomType) => {
              return (
                <div key={room.id}>
                  <RoomInfo room={room} noIndicator noLink />
                </div>
              )
            })}
          </LinkList>
        </div>
      )}
    </div>
  )
}
