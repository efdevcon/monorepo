/* eslint-disable @next/next/no-img-element */
import { useState } from 'react'
import { useRouter } from 'next/router'
import { colorKeys, colorMap } from 'common/components/ticket'
import { SEO } from 'common/components/SEO'
import { SITE_URL } from 'common/constants'
import Link from 'common/components/link/Link'
import cn from 'classnames'
import styles from 'common/components/ticket/styles.module.scss'
import IconArrowRight from 'assets/icons/arrow_right.svg'
import { ColorButtonSvg } from 'common/components/ticket/ColorButtonSvg'
import { ShareButton } from 'common/components/ticket/ShareButton'

const ShareTicket = ({ name }: { name?: string }) => {
  const router = useRouter()
  const queryColor = typeof router.query.color === 'string' ? router.query.color : undefined
  const [color, setColor] = useState(queryColor || 'blue')

  const ticketLink = `/api/ticket?name=${name}&color=${color}`
  const currentUrl = `https://devconnect.org/argentina/ticket/${name}?color=${color}`

  const twitterShare = `I'm going to Devconnect ARG! Get your ticket: ${currentUrl}`
  const warpcastShare = `I'm going to Devconnect ARG! Get your ticket: ${currentUrl}`

  const colorCode = colorMap[color as keyof typeof colorMap].primary

  const handleColorChange = (colorKey: string) => {
    setColor(colorKey)
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, color: colorKey, name },
      },
      undefined,
      { shallow: true }
    )
  }

  return (
    <div
      style={{
        backgroundImage: `url(/argentina/social-bg-img-${color}.jpg)`,
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
        imageUrl={`${SITE_URL.replace(/\/$/, '')}${ticketLink}&social=true`}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
        }}
      >
        Choose your vibe:{' '}
        {colorKeys.map(colorKey => {
          const isSelected = color === colorKey
          const primaryColor = colorMap[colorKey as keyof typeof colorMap].primary
          return (
            <button
              key={colorKey}
              onClick={() => handleColorChange(colorKey)}
              style={{ background: 'none', border: 'none', padding: 0, margin: '10px', cursor: 'pointer' }}
              aria-label={colorKey}
            >
              <ColorButtonSvg color={primaryColor} selected={isSelected} />
            </button>
          )
        })}
      </div>
      <div style={{ width: '630px', maxWidth: '100%' }}>
        <img src={ticketLink} alt={`${name} - Devconnect ARG Ticket`} width={1200} height={630} />
      </div>
      <div className="flex flex-col mt-10">
        <Link href="http://tickets.devconnect.org/">
          <button
            className={cn(
              'border-solid border-b-[6px] group px-8 py-2 border-[#F58A36] text-[#36364C] text-xl font-semibold bg-[#ffa94e] hover:bg-[#f5a236] transition-colors hover:border-opacity-0',
              styles['tiled-button']
            )}
          >
            <div className="group-hover:translate-y-[3px] transition-transform flex items-center gap-2">
              Get your ticket
              <IconArrowRight className="w-4 h-4" />
            </div>
          </button>
        </Link>
      </div>
      <div className="flex flex-col mt-10">
        <div className="text-center">
          <div className="text-white text-xl font-semibold mb-1">Share on</div>
          <div className="flex items-center gap-4">
            <a href={`https://x.com/intent/tweet?text=${twitterShare}`} target="_blank">
              <ShareButton platform="twitter" color={colorCode} />
            </a>
            <a href={`https://warpcast.com/~/compose?text=${warpcastShare}`} target="_blank" rel="noreferrer">
              <ShareButton platform="farcaster" color={colorCode} />
            </a>
            <a href={`https://warpcast.com/~/compose?text=${warpcastShare}`} target="_blank" rel="noreferrer">
              <ShareButton platform="instagram" color={colorCode} />
            </a>
            <a
              href={`https://www.linkedin.com/feed/?shareActive&mini=true&text=${warpcastShare}`}
              target="_blank"
              rel="noreferrer"
            >
              <ShareButton platform="linkedin" color={colorCode} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

const TicketPage = (props: any) => {
  const router = useRouter()
  const color = typeof router.query.color === 'string' ? router.query.color : undefined
  if (!props.params) return null
  return <ShareTicket name={props.params.name} key={color} />
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  return {
    props: {
      params: context.params,
    },
  }
}

export default TicketPage
