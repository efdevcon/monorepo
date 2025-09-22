/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { SITE_URL } from 'common/constants'
import React from 'react'

export const colorMap = {
  blue: { primary: '#74ACDF', secondary: '#417FB8' },
  yellow: { primary: '#F6B40E', secondary: '#B2820A' },
  pink: { primary: '#FF85A6', secondary: '#BF4465' },
  scholar: {},
}

export const colorKeys = Object.keys(colorMap)

const isLatinOnly = (text: string): boolean => {
  return /^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF\uFB00-\uFB4F]+$/.test(
    text
  )
}

export const Ticket = ({
  name = 'Anon',
  color = 'blue',
  option = 'social',
}: {
  name?: string
  color?: string
  option?: string
}) => {
  if (!colorMap[color as keyof typeof colorMap]) {
    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          top: 0,
          left: 0,
        }}
      >
        Invalid color
      </div>
    )
  }

  const type = option === 'instagram' ? 'vibe' : 'ticket'

  console.log('type', type)
  const width = type === 'ticket' ? 1143 : 1080
  const height = type === 'ticket' ? 630 : 1920

  console.log('width', width)
  console.log('height', height)

  if (color === 'scholar') {
    // just show the image + name
    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          top: 0,
          left: 0,
          backgroundColor: 'transparent',
        }}
      >
        <img
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          src={`${SITE_URL}/argentina/${color}-${type}.png`}
          width={1200}
          height={630}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 137,
            left: 135,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              fontSize: '56px',
              color: '#36364C',
              fontFamily: isLatinOnly(name) ? 'Roboto Condensed' : 'Noto Sans SC',
            }}
          >
            {name}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        top: 0,
        left: 0,
        backgroundColor: option === 'social' ? '#36364C' : 'transparent',
      }}
    >
      <img
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: option === 'instagram' ? 0 : 28.5,
        }}
        src={`${SITE_URL}/argentina/${color}-${type}.png`}
        width={width}
        height={height}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: option === 'instagram' ? 883 : 222,
          left: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: option === 'instagram' ? '48px' : '56px',
            color: '#8855CC',
            fontFamily: isLatinOnly(name) ? 'Roboto Condensed' : 'Noto Sans SC',
          }}
        >
          {name}
        </div>
      </div>
    </div>
  )
}

export default Ticket
