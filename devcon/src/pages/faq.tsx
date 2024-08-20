import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import HeroBackground from 'assets/images/pages/hero-bgs/about.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import RichText from 'lib/components/tina-cms/RichText'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import { motion } from 'framer-motion'

const FAQ = (props: any) => {
  const [openFAQ, setOpenFAQ] = React.useState(null)

  const faq = props.faq

  return (
    <div className="flex flex-col mb-6" id={props.anchor.slice(1)}>
      <div className="h2 mb-4 ml-3">{props.title}</div>
      {faq?.map(({ question, answer }: any) => {
        const open = question === openFAQ

        return (
          <div key={question} className="w-full border-[#E2E3FF] bg-[#F8F9FE] rounded-xl shadow mb-4 ">
            <motion.div
              className="w-full px-4 bold cursor-pointer select-none flex justify-between items-center z-[1] relative"
              onClick={() => setOpenFAQ(open ? null : question)}
            >
              <motion.div whileHover={{ x: 10 }} className="grow py-4">
                {question}
              </motion.div>
              <div className="flex opacity-60 !translate-x-0">{open ? <ChevronUp /> : <ChevronDown />}</div>
            </motion.div>

            {open && (
              <motion.div
                initial={{ y: '-20%', opacity: 0 }}
                animate={{ y: '0%', opacity: 100 }}
                className="w-full p-4 pt-2"
              >
                <RichText content={answer}></RichText>
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default pageHOC(function Programming(props: any) {
  const { data: general } = useTina<any>(props.general) as any
  const { data: cityGuide } = useTina<any>(props.cityGuide) as any
  const { data: programming } = useTina<any>(props.programming) as any
  const { data: tickets } = useTina<any>(props.tickets) as any

  const faqs = [
    {
      title: 'General',
      anchor: '#general',
      faq: general.pages.questions,
    },
    {
      title: 'Programming',
      anchor: '#programming',
      faq: programming.pages.faq,
    },
    {
      title: 'Tickets',
      anchor: '#tickets',
      faq: tickets.pages.faq,
    },
    {
      title: 'City Guide',
      anchor: '#city-guide',
      faq: cityGuide.pages.city_guide_faq,
    },
  ]

  return (
    <Page theme={themes['about']}>
      <PageHero
        title="Frequently Asked Questions"
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">About</span> }, { text: 'FAQ' }]}
        navigation={faqs.map(faq => {
          return {
            title: faq.title,
            to: faq.anchor,
          }
        })}
      />

      <div className="section relative">
        <div className="anchor absolute -top-20" id="faq"></div>

        {faqs.map(faq => {
          return <FAQ faq={faq.faq} anchor={faq.anchor} title={faq.title} key={faq.title} />
        })}
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const programming = await client.queries.pages({ relativePath: 'programming.mdx' })
  const cityGuide = await client.queries.pages({ relativePath: 'city_guide.mdx' })
  const tickets = await client.queries.pages({ relativePath: 'tickets.mdx' })
  const general = await client.queries.pages({ relativePath: 'faq.mdx' })

  return {
    props: {
      ...globalData,
      page: {},
      cityGuide,
      programming,
      tickets,
      general,
    },
  }
}
