/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/router'
import { ShareTicket } from './[name]'

const TicketPage = () => {
  return <ShareTicket name="Anon" />
}

export async function getStaticProps() {
  return {
    props: {},
  }
}

export default TicketPage
