import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { Tags } from 'components/common/tags'
import { getGlobalData } from 'services/global'
import { GetContentSections, GetPage, GetFAQ } from 'services/page'
import { useTranslations } from 'next-intl'
import { Snapshot } from 'components/common/snapshot'
import css from './raffle-auction.module.scss'
import AuctionIcon from 'assets/icons/auction.svg'
import { FAQ } from 'components/domain/faq'
import CalendarIcon from 'assets/icons/calendar.svg'
import { Button } from 'components/common/button'
import List from 'components/common/list'
import ticketingCss from './tickets.module.scss'
import { isAfterDate } from './tickets'
import { Link } from 'components/common/link'
import { Message } from 'components/common/message'
import moment from 'moment'

const claimingWindowCloses = moment.utc('2022-07-16 14:00')

const getDateDifference = (start: any, end: any) => {
  const duration = moment.duration(end.diff(start))

  return `${Math.floor(duration.asHours())}:${Math.floor(duration.asMinutes() % 60)}`
}

const ClaimingCountdown = () => {
  const [timeNow, setTimeNow] = React.useState(moment.utc())

  React.useEffect(() => {
    setInterval(() => {
      setTimeNow(moment.utc())
    }, 1000)
  }, [])

  return (
    <Message title="Claiming Window Open">
      <b>
        You have {getDateDifference(timeNow, claimingWindowCloses)} hours to claim your voucher from{' '}
        <Link to="https://raffle.devcon.org/" className="hover-underline">
          raffle.devcon.org
        </Link>
        .
      </b>
    </Message>
  )
}

export default pageHOC(function RaffleAuction(props: any) {
  const intl = useTranslations()
  const pageContext = usePageContext()

  return (
    <Page theme={themes['tickets']}>
      <PageHero
        path={[{ text: <span className="bold">{intl('navigation_tickets')}</span> }, { text: props.page.header }]}
        navigation={[
          {
            title: intl('tickets_raffle_about'),
            to: '#about',
          },
          {
            title: intl('tickets_timeline'),
            to: '#timeline',
          },
          {
            title: props.sections['raffle-specs'].title,
            to: '#specs',
          },
          {
            title: intl('tickets_faq'),
            to: '#faq',
          },
        ]}
      />

      <div className="section">
        <div className={`${css['about']} clear-bottom border-bottom`} id="about">
          <div className={`${css['left']} section-markdown`}>
            <h2>{props.page.title}</h2>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.page.body }} />
          </div>

          <div className={css['right']}>
            <h2 className="spaced">{intl('tickets_raffle_important_dates')}</h2>
            <Snapshot
              items={[
                {
                  Icon: AuctionIcon,
                  title: props.page.header,
                  right: intl('tickets_raffle_auction_dates'),
                },
                {
                  Icon: CalendarIcon,
                  title: intl('tickets_raffle_ticket_sale_waves'),
                  right: (
                    <Link to="/tickets" style={{ textTransform: 'none' }}>
                      {intl('tickets_raffle_ticket_sale_waves_dates')}
                    </Link>
                  ),
                },
              ]}
            />

            {/* <div className={css['claim']}>
              <ClaimingCountdown />
            </div> */}

            {/* <Link to="https://raffle.devcon.org/">
              <Button className="blue lg">
                {isAfterDate('2022-07-14 14:00')
                  ? intl('tickets_raffle_claim')
                  : intl('tickets_raffle_participate_now')}
              </Button>
            </Link> */}
          </div>
        </div>

        <div className="clear-top" id="timeline">
          <h2 className="spaced">{intl('tickets_timeline')}</h2>
          <List
            connectedItems
            items={[
              {
                id: '1',
                title: (
                  <div className={ticketingCss['timeline-item']}>
                    <div className={ticketingCss['left']}>{intl('tickets_raffle_bidding_opens')}</div>
                    <div className={`${ticketingCss['right']} bold`}>
                      {intl('tickets_raffle_bidding_opens_date')} —&nbsp;
                      <span className={`${ticketingCss['when']} font-sm`}>08:00 UTC</span>
                    </div>
                  </div>
                ),
                active: isAfterDate('2022-07-05 08:00'),
                indent: false,
                body: '',
              },
              {
                id: '2',
                title: (
                  <div className={ticketingCss['timeline-item']}>
                    <div className={ticketingCss['left']}>{intl('tickets_raffle_bidding_closes')}</div>
                    <div className={`${ticketingCss['right']} bold`}>
                      {intl('tickets_raffle_bidding_closes_date')} —&nbsp;
                      <span className={`${ticketingCss['when']} font-sm`}>07:59 UTC</span>
                    </div>
                  </div>
                ),
                active: isAfterDate('2022-07-14 07:59'),
                indent: false,
                body: '',
              },
              {
                id: '3',
                title: (
                  <div className={ticketingCss['timeline-item']}>
                    <div className={ticketingCss['left']}>{intl('tickets_raffle_claiming_opens')}</div>
                    <div className={`${ticketingCss['right']} bold`}>
                      {intl('tickets_raffle_claiming_opens_date')} —&nbsp;
                      <span className={`${ticketingCss['when']} font-sm`}>14:00 UTC</span>
                    </div>
                  </div>
                ),
                active: isAfterDate('2022-07-14 14:00'),
                indent: false,
                body: '',
              },
              {
                id: '4',
                title: (
                  <div className={ticketingCss['timeline-item']}>
                    <div className={ticketingCss['left']}>{intl('tickets_raffle_claiming_closes')}</div>
                    <div className={`${ticketingCss['right']} bold`}>
                      {intl('tickets_raffle_claiming_closes_date')} —&nbsp;
                      <span className={`${ticketingCss['when']} font-sm`}>14:00 UTC</span>
                    </div>
                  </div>
                ),
                active: isAfterDate('2022-07-16 14:00'),
                indent: false,
                body: '',
              },
            ]}
          />

          <p className="bold clear-top clear-bottom text-underline">{intl('tickets_raffle_minimum_bid')}</p>
        </div>

        {props.sections['raffle-specs'] && (
          <div>
            <h2 className="spaced" id="specs">
              {props.sections['raffle-specs'].title}
            </h2>

            <div
              className={`markdown markdown clear-bottom`}
              dangerouslySetInnerHTML={{ __html: props.sections['raffle-specs'].body }}
            />
          </div>
        )}

        <div id="faq">
          <FAQ
            noSearch
            data={[{ id: 'something', title: `FAQ - ${intl('tickets_raffle_title')}`, questions: props.faqGeneral }]}
            customCategoryTitle={`FAQ - ${intl('tickets_raffle_general')}`}
          />
        </div>

        <div id="faq">
          <FAQ
            noSearch
            data={[{ id: 'something', title: `FAQ - ${intl('tickets_raffle_auction')}`, questions: props.faqAuction }]}
            customCategoryTitle={`FAQ - ${intl('tickets_raffle_auction')}`}
          />
        </div>

        <div>
          <FAQ
            noSearch
            data={[{ id: 'something', title: `FAQ - ${intl('tickets_raffle_title')}`, questions: props.faqRaffle }]}
            customCategoryTitle={`FAQ - ${intl('tickets_raffle_title')}`}
          />
        </div>
      </div>

      <div className="section">
        <Tags items={pageContext?.current?.tags} viewOnly />
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/raffle-auction', context.locale)
  const sections = await GetContentSections(['raffle-specs'], context.locale)
  const faq = await GetFAQ(context.locale)

  return {
    props: {
      ...globalData,
      faqGeneral: faq.filter((faq: any) => faq.category.id === 'raffle-auction-general'),
      faqAuction: faq.filter((faq: any) => faq.category.id === 'auction'),
      faqRaffle: faq.filter((faq: any) => faq.category.id === 'raffle'),
      page,
      sections,
    },
  }
}
