import { colorKeys, colorMap, Ticket } from 'lib/components/ticket'
import { useState } from 'react'
import argentinaBg from 'assets/images/ba/hero.jpg'

export const ShareTicket = ({ name }: { name?: string }) => {
  const [color, setColor] = useState('blue')
  return (
    <div
      style={{
        backgroundImage: `url(${argentinaBg.src})`,
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
      <div style={{ width: '1200px', maxWidth: '100%', height: '630px', color: 'black' }}>
        <Ticket color={color} name={name} />
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
