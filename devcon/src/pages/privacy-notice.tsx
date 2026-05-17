import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { PrivacyNotice } from 'components/common/layouts/footer/Legal'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'
import { useTranslations } from 'next-intl'

export default function PrivacyNoticePage() {
  const t = useTranslations('common')
  return (
    <Page theme={themes['news']} darkHeader darkFooter>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">{t('privacy_notice_title')}</span> }]}
      />

      <div className="section">
        <PrivacyNotice />
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return { props: {} }
}
