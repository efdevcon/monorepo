/* eslint-disable @next/next/no-img-element */
import { useState } from 'react'

import { colorKeys, colorMap } from 'common/components/ticket'
import { SEO } from 'common/components/SEO'
import { SITE_URL } from 'common/constants'

export const ShareTicket = ({ name }: { name?: string }) => {
  const [color, setColor] = useState('blue')

  const ticketLink = `/api/ticket?name=${name}&color=${color}`

  return (
    <div
      style={{
        backgroundImage: `url(/argentina/social-bg-img-${color}.jpg)`,
        backgroundBlendMode: 'difference',
        backgroundColor: '#74ACDF47',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SEO
        title="Devconnect ARG Tickets"
        description="Share your ticket with the world!"
        imageUrl={`${SITE_URL}${ticketLink}&social=true`}
      />
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        Choose your vibe:{' '}
        {colorKeys.map(colorKey => {
          const isSelected = color === colorKey
          const primaryColor = colorMap[colorKey as keyof typeof colorMap].primary
          return (
            <button
              key={colorKey}
              onClick={() => setColor(colorKey)}
              style={{
                backgroundColor: primaryColor,
                border: isSelected ? `2px solid white` : '0px',
                padding: '10px 20px',
                borderRadius: '5px',
                margin: '10px',
              }}
            ></button>
          )
        })}
      </div>
      <div style={{ width: '630px', maxWidth: '100%' }}>
        <img src={ticketLink} alt={`${name} - Devconnect ARG Ticket`} width={1200} height={630} />
      </div>
    </div>
  )
}

const TicketPage = () => {
  return <ShareTicket />
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}

export default TicketPage
