import React from 'react'
import Image404 from 'assets/images/404.png'
import themes from './themes.module.scss'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { useTranslations } from 'next-intl'

const FourOhFour = () => {
  const t = useTranslations('common')
  return (
    <Page theme={themes['no-page']}>
      <div className="section clear-top clear-bottom">
        <div className="flex flex-col items-center justify-center">
          <h1 className="mb-4">{t('page_not_found')}</h1>
          <Image src={Image404} alt={t('page_not_found_alt')} style={{ width: 'min(100%, 600px)' }} />
        </div>
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}

export default FourOhFour
