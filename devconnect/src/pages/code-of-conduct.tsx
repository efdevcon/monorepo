import { NextPage } from 'next'
import Hero from 'common/components/hero'
import React from 'react'
import css from './code-of-conduct.module.scss'
import { CodeOfConduct } from 'common/components/code-of-conduct/CodeOfConduct'
import { Footer, withTranslations } from 'pages'
import client from '../../tina/__generated__/client'

const CityGuide: NextPage = () => {
  return (
    <div className={css['code-of-conduct']}>
      <Hero
        className={css['hero']}
        autoHeight
        backgroundClassName={css['background']}
        backgroundTitle="Conduct"
        backgroundStyle="fill"
      >
        <></>
      </Hero>
      <div className="section">
        <CodeOfConduct />
      </div>
      <Footer />
    </div>
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
  }
}

export default withTranslations(CityGuide)
