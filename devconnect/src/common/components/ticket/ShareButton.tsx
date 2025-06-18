import React, { useState } from 'react'

import XTwitterLogo from './Name=X-twitter.svg'
import FarcasterLogo from './Name=Farcaster.svg'
import InstagramLogo from './Name=Instagram.svg'
import LinkedinLogo from './Name=Linkedin.svg'
import LensLogo from './Name=Lens.svg'

export type ShareButtonVariant = 'default' | 'focused' | 'pressed' | 'hover'
export type ShareButtonPlatform = 'twitter' | 'farcaster' | 'instagram' | 'linkedin' | 'lens'

interface ShareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ShareButtonVariant
  platform: ShareButtonPlatform
  color?: string
}

const bgStyles: Record<string, (color?: string) => React.CSSProperties> = {
  default: () => ({
    width: 36,
    height: 36,
    background: '#fff',
    boxShadow: '0px 3px 0px 0px #7B7B7B',
  }),
  hover: (color?: string) => ({
    width: 36,
    height: 36,
    background: color || '#74ACDF',
    boxShadow: '0px 3px 0px 0px #7B7B7B',
  }),
  pressed: (color?: string) => ({
    width: 36,
    height: 36,
    background: color || '#74ACDF',
    boxShadow: '0px 1.5px 0px 0px #3C3A3A',
  }),
  focused: () => ({
    width: 36,
    height: 36,
    background: '#fff',
    border: '3px solid #FFF',
  }),
}

export const ShareButton: React.FC<ShareButtonProps> = ({ variant = 'default', platform, ...props }) => {
  const [buttonVariant, setButtonVariant] = useState<ShareButtonVariant>(variant)
  const [isFocused, setIsFocused] = useState(false)

  let Logo: React.ComponentType<any> = XTwitterLogo
  if (platform === 'farcaster') Logo = FarcasterLogo
  else if (platform === 'instagram') Logo = InstagramLogo
  else if (platform === 'linkedin') Logo = LinkedinLogo
  else if (platform === 'lens') Logo = LensLogo

  let bgStyle = bgStyles['default'](props.color)
  if (buttonVariant === 'hover') bgStyle = bgStyles['hover'](props.color)
  else if (buttonVariant === 'pressed') bgStyle = bgStyles['pressed'](props.color)
  else if (buttonVariant === 'focused') bgStyle = bgStyles['focused'](props.color)

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
      <div
        style={
          buttonVariant === 'focused'
            ? { borderRadius: 4, border: '3px solid #FFF', padding: 4 }
            : { borderRadius: 4, border: '3px solid transparent', padding: 4 }
        }
      >
        <div style={bgStyle} />
      </div>
      <span style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>Logo</span>
      <Logo style={{ position: 'absolute', left: 15, top: 15 }} color="#36364C" />
    </button>
  )
}
