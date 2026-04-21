import React from 'react'
import { GetBlogs } from 'services/blogs'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Hero } from 'components/common/dc-8/hero/hero'
import { LandingPage } from 'components/domain/landing-page'
import css from './index.module.scss'
import themes from './themes.module.scss'
import { getMessages } from 'utils/intl'

export default function Index(props: any) {
  return (
    <div className={`${css['layout-default']} ${themes['index']}`}>
      <Header withHero />
      <Hero />

      <div className="z-[11] text-[rgba(255,255,255,0.8)] w-full relative">
        <LandingPage />

        <Footer dark />
      </div>
    </div>
  )
}

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'
  const messages = await getMessages(locale)

  return {
    props: {
      blogs: await GetBlogs(),
      messages,
    },
    revalidate: 1 * 60 * 30,
  }
}
