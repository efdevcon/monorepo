import React from 'react'
import css from './avatar.module.scss'
import { UserProfile } from 'src/types/UserProfile'

type Props = {
  profile: UserProfile
  className?: string
}

export const Avatar = (props: Props) => {
  let className = css['avatar']
  if (props.className) className += ` ${props.className}`

  const split = props.profile.name.trim().split(' ')
  const initials = split.map(i => i.charAt(0).toUpperCase())

  return (
    <div className={className}>
      {props.profile.imageUrl && <img src={props.profile.imageUrl} alt={props.profile.name} />}
      {!props.profile.imageUrl && <p>{initials}</p>}
    </div>
  )
}
