/* eslint-disable @next/next/no-img-element */
import { ShareTicket } from './[...slug]'

const TicketPage = () => {
  return <ShareTicket name="Anon" color="blue" />
}

export async function getStaticProps() {
  return {
    props: {},
  }
}

export default TicketPage
