import { Hero } from 'components/domain/index/hero'
import { SITE_URL } from 'utils/constants'

const Ticket = (props: { imageUrl: string }) => {
  return <Hero name="Anon" ticketMode imageUrl={props.imageUrl}></Hero>
}

export async function getStaticProps() {
  const baseUrl = process.env.DEPLOY_PRIME_URL || SITE_URL
  const imageUrl = `${baseUrl.replace(/\/$/, '')}/api/mumbai/ticket/Anon`

  return {
    props: { imageUrl },
  }
}

export default Ticket
