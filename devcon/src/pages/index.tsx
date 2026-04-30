import React from 'react'
import { GetBlogs } from 'services/blogs'
import { getFaqData } from 'services/faq'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Hero } from 'components/common/dc-8/hero/hero'
import { LandingPage } from 'components/domain/landing-page'
import css from './index.module.scss'
import themes from './themes.module.scss'
import { getMessages } from 'utils/intl'

const HOMEPAGE_FAQ_CATEGORY = 'Tickets & availability'
const HOMEPAGE_FAQ_LIMIT = 7

export default function Index(props: any) {
  return (
    <div className={`${css['layout-default']} ${themes['index']}`}>
      <Header withHero />
      <Hero />

      <div className="z-[11] text-[rgba(255,255,255,0.8)] w-full relative">
        <LandingPage faqItems={props.faqItems} />

        <Footer dark />
      </div>
    </div>
  )
}

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'
  const messages = await getMessages(locale)

  let faqItems: Array<{ question: string; answer: string }> = []
  try {
    const data = await getFaqData()
    faqItems = data.items
      .filter(i => i.category === HOMEPAGE_FAQ_CATEGORY && i.answer.trim() !== '')
      .slice(0, HOMEPAGE_FAQ_LIMIT)
      .map(i => ({ question: i.question, answer: i.answer }))
  } catch {
    // Fall back to empty list — FaqSection will render its hardcoded fallback
  }

  return {
    props: {
      blogs: await GetBlogs(),
      messages,
      faqItems,
    },
    revalidate: 1 * 60 * 30,
  }
}
