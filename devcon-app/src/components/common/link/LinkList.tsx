import React from 'react'
import css from './link-list.module.scss'
import IconCalendar from 'assets/icons/schedule-plus.svg'
import IconLink from 'assets/icons/link-chain.svg'
import IconExternalLink from 'assets/icons/external-link.svg'
import googleDriveImage from './google-drive.png'
import Image from 'next/image'

export const LinkList = (props: any) => {
  return (
    <div className={props.className}>
      {React.Children.map(props.children, child => {
        return React.cloneElement(child, {
          className: child.props.className ? `${child.props.className} list-item` : 'list-item',
          children: (() => {
            const isGoogleDrive = child.props.to?.includes('drive.google.com')
            const isExternal = child.props.to?.match(/^([a-z0-9]*:|.{0})\/\/.*$/)

            let className = css['link']

            if (isGoogleDrive) {
              className += ` ${css['with-thumbnail']}`
            }

            const icon = (() => {
              if (props.noIndicator) return null
              if (isExternal) return <IconExternalLink />

              return <IconLink />
            })()

            return (
              <div className={className}>
                {isGoogleDrive && <Image src={googleDriveImage} className={css['thumbnail']} alt="Google drive" />}
                <div className={css['link-text']}>{child.props.children}</div>
                {icon}
              </div>
            )
          })(),
        })
      })}
    </div>
  )
}
