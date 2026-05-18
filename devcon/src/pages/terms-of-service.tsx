import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { TermsOfService } from 'components/common/layouts/footer/Legal'
import HeroBackground from './ecosystem-program/hero-bg.png'
import css from './ecosystem-program/ecosystem-program.module.scss'
import { useTranslations } from 'next-intl'

export default function TermsOfServiceTemplate() {
  const t = useTranslations('common')
  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('terms_of_service_title')}
      />

      <div className="section pt-8">
        <TermsOfService />
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return { props: {} }
}
