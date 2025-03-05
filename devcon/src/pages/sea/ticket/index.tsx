import { Hero } from 'components/domain/index/hero'

const Ticket = () => {
  return <Hero name="Anon" ticketMode></Hero>
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}

export default Ticket
