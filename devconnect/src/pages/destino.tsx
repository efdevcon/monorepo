import React from 'react'
import Head from 'next/head'
import Destino from 'common/components/ba/destino/destino'
import { Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'

const DestinoPage = () => {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>
      <Header active />
      <Destino />
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  return {
    props: {
      translations,
      locale,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(DestinoPage)
