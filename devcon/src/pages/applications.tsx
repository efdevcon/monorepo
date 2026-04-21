import React, { useState } from 'react'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import css from './tickets/tickets-landing.module.scss'
import HeroBackground from './tickets/updated-hero.png'
import ApplicationPage from 'components/domain/student-applications/ApplicationPage'
import { useTranslations } from 'next-intl'

export default function Applications() {
  const t = useTranslations('applications')
  const [isAdminMode, setIsAdminMode] = useState(false)

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <title>{t('page_title')}</title>
      </Head>

      <Page theme={themes['tickets']} withHero darkFooter>
        <PageHero
          className={`${css['hero-no-side-gradient']} !mb-0`}
          titleClassName={css['hero-title']}
          heroBackground={HeroBackground}
          path={[]}
          title={t('hero_title')}
        />

        <div className={isAdminMode ? '' : 'section'} style={{ paddingTop: isAdminMode ? 0 : '2rem' }}>
          <div className={isAdminMode ? '' : 'content'}>
            <ApplicationPage onAdminModeChange={setIsAdminMode} />
          </div>
        </div>
      </Page>
    </>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
