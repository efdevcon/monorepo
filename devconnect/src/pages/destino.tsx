import React from 'react'
import Destino from 'common/components/ba/destino/destino'
import { Footer, Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import { SEO } from 'common/components/SEO'

const DestinoPage = ({ content }: { content: any }) => {
  const { data }: { data: any } = useTina(content)

  // console.log(data.pages)

  return (
    <>
      <SEO
        title="Destino Devconnect Grants"
        description="A local grant round to bring Argentina onchain."
        imageUrl={`https://devconnect.org/destino/hero-bg.png`}
      />
      <Header active />
      <Destino content={data.pages} />
      <Footer />
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const path = locale === 'en' ? 'destino_devconnect.mdx' : locale + '/destino_devconnect.mdx'
  const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  return {
    props: {
      translations,
      locale,
      content,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(DestinoPage)
