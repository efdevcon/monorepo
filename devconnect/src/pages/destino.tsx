import React from 'react'
import Head from 'next/head'
import Destino from 'common/components/ba/destino/destino'
import { Footer, Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'

const DestinoPage = ({ content }: { content: any }) => {
  return (
    <>
      <Header active />
      <Destino content={content} />
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
