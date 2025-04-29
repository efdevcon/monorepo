import React from 'react'
import Destino from 'common/components/ba/destino/destino'
import { Footer, Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import { SEO } from 'common/components/SEO'

const DestinoPage = ({ content, events }: { content: any; events: any }) => {
  const { data }: { data: any } = useTina(content)

  return (
    <>
      <SEO
        title="Destino Devconnect Grants"
        description="A local grant round to bring Argentina onchain."
        imageUrl={`https://devconnect.org/destino/hero-bg.png`}
      />
      <Header active />
      <Destino content={data.pages} events={events} />
      <Footer />
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const path = locale === 'en' ? 'destino_devconnect.mdx' : locale + '/destino_devconnect.mdx'
  const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  // Mock events data for Destino
  const events = [
    {
      Name: 'Destino Hackathon',
      Description: 'A 3-day hackathon focused on onboarding developers to Ethereum.',
      Location: 'Buenos Aires, Argentina',
      Date: {
        startDate: '2024-11-10',
        endDate: '2024-11-12',
      },
      Link: '/destino/hackathon',
    },
    {
      Name: 'Building on L2 Workshop',
      Description: 'Learn how to deploy and optimize applications on Ethereum L2 solutions.',
      Location: 'Córdoba, Argentina',
      Date: {
        startDate: '2024-11-15',
        endDate: '2024-11-15',
      },
      Link: '/destino/l2-workshop',
    },
    {
      Name: 'DeFi Summit Argentina',
      Description: 'Connect with DeFi builders and learn about the latest protocols and opportunities.',
      Location: 'Mendoza, Argentina',
      Date: {
        startDate: '2024-11-18',
        endDate: '2024-11-20',
      },
      Link: '/destino/defi-summit',
    },
    {
      Name: 'Ethereum Community Meetup',
      Description: 'Network with local Ethereum enthusiasts and projects.',
      Location: 'Rosario, Argentina',
      Date: {
        startDate: '2024-12-05',
        endDate: '2024-12-05',
      },
      Link: '/destino/eth-meetup',
    },
    {
      Name: 'Zero-Knowledge Proofs Conference',
      Description: 'Deep dive into ZK technology and its applications on Ethereum.',
      Location: 'Buenos Aires, Argentina',
      Date: {
        startDate: '2024-12-10',
        endDate: '2024-12-12',
      },
      Link: '/destino/zk-conference',
    },
  ]

  return {
    props: {
      translations,
      locale,
      content,
      events,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(DestinoPage)
