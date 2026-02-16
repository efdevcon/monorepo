import { Hero } from 'components/domain/index/hero'
import { SITE_URL } from 'utils/constants'

const Ticket = () => {
  const imageUrl = `${SITE_URL}api/mumbai/ticket/Anon`

  return <Hero name="Anon" ticketMode imageUrl={imageUrl}></Hero>
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}

export default Ticket
