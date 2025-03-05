import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { CodeOfConduct } from 'components/common/layouts/footer/Legal'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'

export default function CodeOfConductTemplate(props: any) {
  return (
    <Page theme={themes['news']}>
      <PageHero heroBackground={HeroBackground} path={[{ text: 'Code of Conduct' }]} />

      <div className="section">
        <CodeOfConduct />
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
