/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { SITE_URL } from 'common/constants'
import React from 'react'

export const colorMap = {
  blue: { primary: '#74ACDF', secondary: '#417FB8' },
  yellow: { primary: '#F6B40E', secondary: '#B2820A' },
  pink: { primary: '#FF85A6', secondary: '#BF4465' },
}

export const colorKeys = Object.keys(colorMap)

export const Ticket = ({
  name = 'Anon',
  color = 'blue',
  social = 'false',
}: {
  name?: string
  color?: string
  social?: string
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

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        top: 0,
        left: 0,
        backgroundColor: social === 'true' ? '#36364C' : 'transparent',
      }}
    >
      <img
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 28.5,
          width: '1143px',
          height: '630px',
        }}
        src={`${SITE_URL}/argentina/${color}-ticket.png`}
        width={1143}
        height={630}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 200,
          left: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: '48px',
            color: '#8855CC',
            fontFamily: 'Roboto Condensed',
          }}
        >
          {name}
        </div>
      </div>
    </div>
  )
}

export default Ticket
