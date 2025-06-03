import React, { useState } from 'react'

import TypeDefault from './Type=default.svg'
import TypeFocused from './Type=focused.svg'
import TypePressed from './Type=pressed.svg'
import TypeHover from './Type=hover.svg'
import XTwitterLogo from './Name=X-twitter.svg'
import FarcasterLogo from './Name=Farcaster.svg'
import InstagramLogo from './Name=Instagram.svg'
import LinkedinLogo from './Name=Linkedin.svg'

export type ShareButtonVariant = 'default' | 'focused' | 'pressed' | 'hover'
export type ShareButtonPlatform = 'twitter' | 'farcaster' | 'instagram' | 'linkedin'

interface ShareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ShareButtonVariant
  platform: ShareButtonPlatform
}

export const ShareButton: React.FC<ShareButtonProps> = ({ variant = 'default', platform, ...props }) => {
  const [buttonVariant, setButtonVariant] = useState<ShareButtonVariant>(variant)
  const [isFocused, setIsFocused] = useState(false)

  let SvgComponent = TypeDefault
  if (buttonVariant === 'hover') SvgComponent = TypeHover
  else if (buttonVariant === 'pressed') SvgComponent = TypePressed
  else if (buttonVariant === 'focused') SvgComponent = TypeFocused

  let Logo: React.ComponentType<any> = XTwitterLogo
  if (platform === 'farcaster') Logo = FarcasterLogo
  else if (platform === 'instagram') Logo = InstagramLogo
  else if (platform === 'linkedin') Logo = LinkedinLogo

  return (
    <button
      {...props}
      style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        ...props.style,
      }}
      onMouseEnter={e => {
        setButtonVariant('hover')
        props.onMouseEnter?.(e)
      }}
      onMouseLeave={e => {
        setButtonVariant(isFocused ? 'focused' : 'default')
        props.onMouseLeave?.(e)
      }}
      onMouseDown={e => {
        setButtonVariant('pressed')
        props.onMouseDown?.(e)
      }}
      onMouseUp={e => {
        setButtonVariant('hover')
        props.onMouseUp?.(e)
      }}
      onFocus={e => {
        setIsFocused(true)
        setButtonVariant('focused')
        props.onFocus?.(e)
      }}
      onBlur={e => {
        setIsFocused(false)
        setButtonVariant('default')
        props.onBlur?.(e)
      }}
      aria-label="Share"
    >
      <span style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>Share</span>
      <SvgComponent />
      <span style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>Logo</span>
      <Logo style={{ position: 'absolute', left: 10, top: 10 }} />
    </button>
  )
}
