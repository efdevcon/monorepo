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
import moment from 'moment'
import { GetTicketQuota } from 'services/tickets'
import { useTicketQuota } from 'hooks/useTicketQuota'

const ticketWaves = [
  moment.utc('2024-07-16 16:00:00'),
  moment.utc('2024-07-16 23:00:00'),
  moment.utc('2024-07-30 16:00:00'),
  // moment.utc('2024-07-30 23:00:00'),
  moment.utc('2024-08-13 16:00:00'),
  // moment.utc('2024-08-13 23:00:00'),
]

export default pageHOC(function Tickets(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesTickets
  const faq = pages.faq
  const [openFAQ, setOpenFAQ] = React.useState<string | null>(null)
  const [timeUntilNextWave, setTimeUntilNextWave] = React.useState<string | null>(null)
  // For mocking real time dates
  // const [currentDate, setCurrentDate] = React.useState<any>(moment.utc('2024-07-31 15:59:55'))
  const currentDate = moment.utc()
  const ticketQuota = useTicketQuota(props.ticketQuota)

  let upcomingWave: any
  const latestWave = ticketWaves
    .slice()
    .reverse()
    .find((wave, index: any) => {
      if (wave.isBefore(currentDate)) {
        const unreversedIndex = ticketWaves.length - index
        upcomingWave = ticketWaves[unreversedIndex]

        return true
      }

      return false
    })

  if (!latestWave) {
    upcomingWave = ticketWaves[0]
  }

  React.useEffect(() => {
    const interval = setInterval(() => {
      // Mock realtime update
      // setCurrentDate(currentDate.add('1', 's'))
      const currentDate = moment.utc()

      let upcomingWaveAdjusted = upcomingWave || ticketWaves[ticketWaves.length - 1] // random date fallback, just to keep the interval ticking

      const remainingTime = upcomingWaveAdjusted.diff(currentDate, 'seconds')
      const diffDays = Math.floor(remainingTime / (60 * 60 * 24))
      const diffHours = Math.floor((remainingTime % (60 * 60 * 24)) / (60 * 60))
      const diffMinutes = Math.floor((remainingTime % (60 * 60)) / 60)
      const diffSeconds = remainingTime % 60

      let time = `${diffHours}h ${diffMinutes}m ${diffSeconds}s`

      if (diffDays > 0) {
        time = `${diffDays}d ${diffHours}h ${diffMinutes}m ${diffSeconds}s`
      }

      setTimeUntilNextWave(time)
    }, 1000)

    return () => clearInterval(interval)
  }, [upcomingWave])

  let waveActive: any = ticketQuota && ticketQuota.available && latestWave

  const minutesDifference = currentDate.diff(latestWave, 'minutes')
  const waveReleasedWithin5Minutes = latestWave && minutesDifference < 5

  // Update the waveActive flag
  waveActive = waveReleasedWithin5Minutes || waveActive

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
            title: 'Discounts',
            to: '#discounts',
          },
          {
            title: 'Application Based',
            to: '#app-based',
          },
          {
            title: 'Timeline',
            to: '#timeline',
          },
          {
            title: 'Raffle Auction',
            to: '#raffle',
          },
          {
            title: 'FAQ',
            to: '#faq',
          },
        ]}
      />

      <div className="section" id="overview">
        <div className={cn('flex justify-between gap-8 pb-8 flex-col lg:flex-row')}>
          <div className="grow">{pages?.overview?.intro && <RichText content={pages.overview.intro} />}</div>
          <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[750px]">
            <CallToAction
              color="blue"
              title={'Ticketing Status'}
              tag={waveActive ? 'Ticket Wave Live' : 'Discounts Available'}
              BackgroundSvg={SpeakersBackground}
              // link="https://tickets.devcon.org"
              // linkText="Buy Tickets"
              // buttonDisabled
              meta=""
            >
              {waveActive && pages?.overview?.card && <RichText content={pages.overview.card} />}
              {!waveActive && (
                <div>
                  <p className="h4 font-secondary">
                    {upcomingWave
                      ? 'Next General Admission Ticket wave in'
                      : 'There are no more planned General Admission ticket waves.'}
                  </p>
                  {upcomingWave && (
                    <p className="h4 mt-1 font-secondary">
                      <b>{timeUntilNextWave}</b>
                    </p>
                  )}

                  <Link to="https://tickets.devcon.org">
                    <Button color="blue-1" className="mt-3" fat fill disabled>
                      {latestWave === ticketWaves[1] && 'Next Wave - July 30'}
                      {latestWave === ticketWaves[2] && 'Next wave - August 13'}
                      {latestWave === ticketWaves[3] && 'All waves sold out'}

                      {/* Wave {latestWave === ticketWaves[1] && '1'} {latestWave === ticketWaves[2] && '2'}{' '}
                      {latestWave === ticketWaves[3] && '3'} Sold Out */}
                    </Button>
                  </Link>

                  <Link to="#timeline">
                    <p className="mt-4 bold text-[var(--theme-color)]">→ See timeline for details</p>
                  </Link>
                  <Link to="#discounts">
                    <p className="mt-4 bold text-[var(--theme-color)]">
                      → Check discount eligibility or apply for student/builder tickets
                    </p>
                  </Link>
                </div>
              )}
            </CallToAction>
          </div>
        </div>
      </div>

      {/* <div className="section" id="raffle">
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
      </div> */}

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
                active: currentDate.isAfter(moment.utc('2024-07-31 00:00:00')),
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
            Our GA ticket sales begin on <b>July 16</b>, and each wave will launch at <b>16:00 UTC</b>.
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
                      {/* {waveActive && (latestWave === ticketWaves[0] || latestWave === ticketWaves[1]) && ( */}
                      <div className="label purple rounded-lg !border-2 bold !text-xs ghost ml-2 !bg-white">
                        SOLD OUT
                      </div>
                      {/* )} */}
                    </div>
                    <div className="bold">July 16</div>
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
                    <div className="flex relative items-center">
                      <div>Wave 02</div>
                      {waveActive && latestWave === ticketWaves[2] && (
                        <div className="label purple rounded-lg !border-2 bold !text-xs ghost ml-2 !bg-white">live</div>
                      )}
                      <div className="label purple rounded-lg !border-2 bold !text-xs ghost ml-2 !bg-white">
                        SOLD OUT
                      </div>
                    </div>

                    <div className="bold">July 30</div>
                  </div>
                ),
                indent: false,
                active: currentDate.isAfter(ticketWaves[2]),
                body: '',
              },
              {
                id: '3',
                title: (
                  <div className="flex justify-between w-full max-w-[600px] text-base">
                    <div>Wave 03</div>
                    {waveActive && latestWave === ticketWaves[3] && (
                      <div className="label purple rounded-lg !border-2 bold !text-xs ghost ml-2 !bg-white">live</div>
                    )}
                    <div className="bold">August 13</div>
                  </div>
                ),
                indent: false,
                active: currentDate.isAfter(ticketWaves[3]),
                body: '',
              },
            ]}
          />
        </div>
      </div>

      <div className="section" id="raffle">
        <div className="pt-8 border-top mt-8 pb-6 relative">
          {pages?.raffle_auction?.intro && <RichText content={pages.raffle_auction?.intro} />}
          <div className={`${indexCss['scrolling-text-background']} ${css['fade-color']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">RAFFLE-AUCTION&nbsp;</p>
            </InfiniteScroller>
          </div>
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
  const ticketQuota = await GetTicketQuota()
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
      ticketQuota,
    },
    revalidate: 3600,
  }
}
