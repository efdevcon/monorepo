import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { GetPage } from 'services/page'
import { usePageContext } from 'context/page-context'
import HeroBackground from 'assets/images/pages/hero-bgs/ticketing.jpeg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesTickets, PagesQuery } from '../../tina/__generated__/types'
import RichText from 'lib/components/tina-cms/RichText'
import { motion } from 'framer-motion'
import { Link } from 'components/common/link'
import { Button } from 'lib/components/button'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import CallToAction from 'components/common/card/CallToActionCard'
import SpeakersBackground from 'assets/images/pages/program.svg'
import InfiniteScroller from 'lib/components/infinite-scroll'
import indexCss from './index.module.scss'
import cn from 'classnames'
import css from './tickets.module.scss'
import { Snapshot } from 'components/common/snapshot'
import CalendarIcon from 'assets/icons/calendar.svg'
import AuctionIcon from 'assets/icons/auction.svg'
import SwirlIcon from 'assets/icons/swirl.svg'
import { SelfClaimingDiscounts } from 'components/domain/discounts'
import List from 'components/common/list'

export default pageHOC(function Tickets(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesTickets
  const faq = pages.faq
  const [openFAQ, setOpenFAQ] = React.useState<string | null>(null)

  return (
    <Page theme={themes['light-blue']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Event</span> }, { text: 'Tickets' }]}
        title="Tickets"
        navigation={[
          {
            title: 'Overview',
            to: '#overview',
          },
          {
            title: 'Raffle Auction',
            to: '#raffle',
          },
          {
            title: 'Discounts',
            to: '#discounts',
          },
          {
            title: 'Timeline',
            to: '#timeline',
          },
          {
            title: 'FAQ',
            to: '#faq',
          },
        ]}
      />

      <div className="section" id="overview">
        <div className={cn('flex justify-between gap-8 flex-col lg:flex-row')}>
          <div className="grow">{pages?.overview?.intro && <RichText content={pages.overview.intro} />}</div>
          <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[750px]">
            <CallToAction
              color="blue"
              title={'Tickets'}
              tag="Raffle-Auction is live"
              BackgroundSvg={SpeakersBackground}
              link={pages.overview?.button?.link}
              linkText={pages.overview?.button?.text}
              // buttonDisabled
              meta=""
            >
              {pages?.overview?.card && <RichText content={pages.overview.card} />}
            </CallToAction>
          </div>
        </div>
      </div>

      <div className="section" id="raffle">
        <div className="py-8 border-top border-bottom my-8">
          {pages?.raffle_auction?.intro && <RichText content={pages.raffle_auction?.intro} />}
        </div>
        <div className="">
          <div className="text-xl bold font-secondary mb-6">Participation Rules</div>

          <div className="flex justify-between flex-col lg:flex-row gap-8 lg:gap-16 w-full">
            <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[450px] text-md">
              <Snapshot
                // @ts-ignore
                items={pages?.raffle_auction?.participation_rules?.snapshot.map(
                  ({ left, right }: any, index: number) => {
                    let icon

                    // TODO: Icon support in CMS
                    if (index === 0) {
                      icon = SwirlIcon
                    }
                    if (index === 1) {
                      icon = AuctionIcon
                    }
                    if (index === 2) {
                      icon = CalendarIcon
                    }

                    return {
                      id: index,
                      Icon: icon,
                      left: left,
                      right: right,
                    }
                  }
                )}
              />
            </div>
            {/* @ts-ignore */}
            {pages?.raffle_auction?.intro && <RichText content={pages.raffle_auction?.participation_rules.text} />}
          </div>
        </div>
        <div className="mt-10">
          {pages?.raffle_auction?.intro && <RichText content={pages.raffle_auction?.sybil_resistance} />}
        </div>
        <div className="mt-8 relative border-top pt-8 pb-8">
          {pages?.raffle_auction?.intro && <RichText content={pages.raffle_auction?.specs} />}
          <div className={`${indexCss['scrolling-text-background']} ${css['fade-color']}`}>
            <InfiniteScroller nDuplications={2} speed="120s" reverse>
              <p className="bold">RAFFLE AUCTION&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>
      </div>
      {/* 
      <div className="section">
        <div className="py-8 border-top">
          <div className="h2 mb-8">Other methods to attend</div>
          

          <div className="flex flex-col gap-4">
            {/* @ts-ignore }
            {pages?.other_methods_to_attend?.steps_raffle.map(({ title, answer }: any, index: number) => {
              // @ts-ignore
              const isLast = pages?.other_methods_to_attend?.steps_raffle - 1 === index

              return (
                <div className={cn('flex flex-col', { 'border-bottom pb-8': !isLast })} key={index}>
                  <div className="flex items-center mb-4">
                    <button className={cn(css['round-button'], 'mr-3 shrink-0')}>
                      <span>{index + 1}</span>
                    </button>
                    <div className="bold h5 flex items-center justify-center">{title}</div>
                  </div>

                  <div className="text">
                    <RichText content={answer}></RichText>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div> */}

      <SelfClaimingDiscounts />

      <div className={cn('section', css['timeline'])}>
        <div className="pt-8 border-top pb-8 relative">
          <div className={`${indexCss['scrolling-text-background']} ${css['fade-color']} ${indexCss['alternate']}`}>
            <InfiniteScroller nDuplications={2} speed="120s" reverse>
              <p className="bold">TICKET TIMELINE&nbsp;</p>
            </InfiniteScroller>
          </div>

          <div className="h2 mb-6" id="timeline">
            Timeline
          </div>

          <p className="text-lg mb-2 bold">Presale Raffle+Auction</p>

          <List
            connectedItems
            items={[
              {
                id: '1',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div className="flex relative items-center">
                      <div>Raffle+Auction Bidding Begins</div>
                      {/* <div className="label purple rounded-lg !border-2 bold !text-xs ghost ml-2 !bg-white">
                                    live
                                  </div> */}
                    </div>
                    <div className="bold shrink-0">June 18</div>
                  </div>
                ),
                indent: false,
                active: true,
                body: '',
              },
              {
                id: '2',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div>Raffle+Auction Bidding Ends </div>

                    <div className="bold shrink-0">
                      {/* <div className="label blue rounded-lg !border-2 bold !text-xs ghost mr-2 !bg-white">live</div> */}
                      July 9{' '}
                    </div>
                  </div>
                ),
                indent: false,
                active: true,
                body: '',
              },
              {
                id: '3',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div>Raffle+Auction Claiming Begins</div>
                    <div className="bold shrink-0">July 9</div>
                  </div>
                ),
                indent: false,
                active: true,
                body: '',
              },
              {
                id: '4',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div>Raffle+Auction Claiming Ends</div>
                    <div className="bold shrink-0">July 31</div>
                  </div>
                ),
                indent: false,
                active: false,
                body: '',
              },
            ]}
          />

          <p className="text-lg my-2 bold">Discounted Tickets</p>

          <List
            connectedItems
            items={[
              {
                id: '1',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div className="flex relative items-center">
                      <div>Discount Ticket Applications open</div>
                    </div>
                    <div className="bold shrink-0">July 9</div>
                  </div>
                ),
                indent: false,
                active: true,
                body: '',
              },
              {
                id: '2',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div>Discount Ticket Responses sent on rolling basis</div>
                    <div className="bold shrink-0">Review</div>
                  </div>
                ),
                indent: false,
                active: false,
                body: '',
              },
            ]}
          />

          <p className="text-lg my-2 bold">General Ticketing Waves</p>

          <p className="my-4">
            Our GA ticket sales begin on <b>July 16</b>, and each wave will launch at <b>16:00 UTC and 23:00 UTC</b>.
          </p>

          <List
            connectedItems
            items={[
              {
                id: '1',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div className="flex relative items-center">
                      <div>Wave 01</div>
                      {/* <div className="label purple rounded-lg !border-2 bold !text-xs ghost ml-2 !bg-white">
                                    live
                                  </div> */}
                    </div>
                    <div className="bold">July 16</div>
                  </div>
                ),
                indent: false,
                active: false,
                body: '',
              },
              {
                id: '2',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div>Wave 02</div>
                    <div className="bold">July 30</div>
                  </div>
                ),
                indent: false,
                active: false,
                body: '',
              },
              {
                id: '3',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div>Wave 03</div>
                    <div className="bold">August 13</div>
                  </div>
                ),
                indent: false,
                active: false,
                body: '',
              },
            ]}
          />
        </div>
      </div>

      <div className="section mb-12 relative">
        <div className="anchor absolute -top-20" id="faq"></div>
        <div className="h2 bold mb-6 pt-8 border-top">Frequently Asked</div>
        <div className="flex flex-col">
          {faq?.map(({ question, answer }: any) => {
            const open = question === openFAQ

            return (
              <div key={question} className="w-full border-[#E2E3FF] bg-[#F8F9FE] rounded-xl shadow mb-4 ">
                <div
                  className="w-full p-4 bold cursor-pointer select-none hover:opacity-70 flex justify-between items-center"
                  onClick={() => setOpenFAQ(open ? null : question)}
                >
                  {question}
                  <div className="flex opacity-60">{open ? <ChevronUp /> : <ChevronDown />}</div>
                </div>

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
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  // await GetPage('terms-of-service', context.locale)

  const content = await client.queries.pages({ relativePath: 'tickets.mdx' })

  return {
    props: {
      ...globalData,
      page: {
        title: 'Tickets',
      },
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}

/*
  OG image for each page
*/
