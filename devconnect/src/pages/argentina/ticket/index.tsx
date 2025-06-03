/* eslint-disable @next/next/no-img-element */
import { colorKeys } from 'common/components/ticket'
import { ShareTicket } from './[...slug]'

const TicketPage = () => {
  const color = colorKeys[Math.floor(Math.random() * colorKeys.length)]
  return <ShareTicket name="Anon" color={color} />
}

export async function getStaticProps() {
  const name = 'Anon'
  const color = colorKeys[Math.floor(Math.random() * colorKeys.length)]
  const ticketLink = `/api/ticket/${name}/${color}/social`

  return {
    props: {
      seo: {
        title: `${name}'s Devconnect ARG Ticket`,
        description: `${name} is going to Devconnect ARG! Get your ticket and join the community.`,
        imageUrl: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')}${ticketLink}`,
      },
    },
  }
}

export default TicketPage
