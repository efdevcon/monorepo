import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { TermsOfService } from 'components/common/layouts/footer/Legal'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'
import { useTranslations } from 'next-intl'

export default function TermsOfServiceTemplate(props: any) {
  const t = useTranslations('common')
  return (
    <Page theme={themes['news']}>
      <PageHero heroBackground={HeroBackground} path={[{ text: <span className="bold">{t('terms_of_service_title')}</span> }]} />

      <div className="section">
        <TermsOfService />
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
