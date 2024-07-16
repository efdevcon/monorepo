import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { Tags } from 'components/common/tags'
import { getGlobalData } from 'services/global'
import { GetPage, GetFAQ, GetContentSections } from 'services/page'
import { FAQ } from 'components/domain/faq'
import { useTranslations } from 'next-intl'
import { Snapshot } from 'components/common/snapshot'
import CalendarIcon from 'assets/icons/calendar.svg'
import TicketIcon from 'assets/icons/ticket.svg'
import AuctionIcon from 'assets/icons/auction.svg'
import NoteIcon from 'assets/icons/note.svg'
import css from './tickets.module.scss'
import List from 'components/common/list'
import DevconLogo from 'assets/images/devcon-6-logo.png'
import Image from 'next/legacy/image'
import { Link } from 'components/common/link'
import moment from 'moment'
import { GetTicketQuota } from 'services/tickets'
import { useTicketQuota } from 'hooks/useTicketQuota'
import { DEFAULT_REVALIDATE_PERIOD } from 'utils/constants'

// Check if given string e.g. "2022-06-06" is before the current date
export const isAfterDate = (dateString: string) => {
  const date = moment.utc(dateString)
  const currentDate = moment.utc()

  return date.isBefore(currentDate)
}

type TicketProps = {
  title: string
  price: string
  tags: {
    text: string
    link?: string
  }[]
  disabled?: boolean
  description: React.ReactElement
  number: string
  link?: string
  withoutCurrency?: boolean
  color?: 'grey' | 'blue'
}

const Ticket = (props: TicketProps) => {
  let className = css['ticket']

  if (props.color) className += ` ${css[props.color]}`
  if (props.disabled) className += ` ${css['disabled']}`

  const body = (
    <div className={className}>
      <div className={css['background-logo']}></div>
      <div className={css['mask']}></div>
      <div className={css['border']}></div>
      <div className={css['left']}>
        <div className={css['background-number']}>
          <span>{props.number}</span>
        </div>
        <Image src={DevconLogo} alt="Devcon logo" />

        <p className="h3">{props.title}</p>
        <p className={css['price']}>
          {props.withoutCurrency ? (
            <span className={css['free']}>{props.price}</span>
          ) : (
            <>
              {props.price} <span className={css['currency']}>USD/DAI</span>
            </>
          )}
        </p>
      </div>
      <div className={css['right']}>
        <span className="font-sm bold">{props.description}</span>
        <div>
          {props.tags.map(tag => {
            if (tag.link) {
              return (
                <Link to={tag.link} key={tag.text} className={`${css['tag']} label bold hover-underline`}>
                  {tag.text}
                </Link>
              )
            }

            return (
              <span key={tag.text} className={`${css['tag']} label bold`}>
                {tag.text}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )

  // if (props.link) {
  //   return <Link to={props.link}>{body}</Link>
  // }

  return body
}

export default pageHOC(function Tickets(props: any) {
  const intl = useTranslations()
  const pageContext = usePageContext()
  const ticketQuota = useTicketQuota(props.ticketQuota)

  const ticketLink = 'https://tickets.devcon.org/'
  const currentDate = moment.utc()
  const ticketWaves: {
    [T: number]: moment.Moment
  } = {
    1: moment.utc('2022-07-18 16:00:00'),
    2: moment.utc('2022-07-18 23:00:00'),
    3: moment.utc('2022-07-26 16:00:00'),
    4: moment.utc('2022-07-26 23:00:00'),
    5: moment.utc('2022-08-03 16:00:00'),
    6: moment.utc('2022-08-03 23:00:00'),
    7: moment.utc('2022-08-11 16:00:00'),
    8: moment.utc('2022-08-11 23:00:00'),
    9: moment.utc('2022-08-23 16:00:00'),
    10: moment.utc('2022-08-23 23:00:00'),
  }

  function renderTicketWaveInfo(wave: number) {
    if (currentDate.isBefore(ticketWaves[wave]) && currentDate.isAfter(ticketWaves[wave - 1])) {
      return <p className="bold">{intl('tickets_coming_soon')}</p>
    }

    if (currentDate.isAfter(ticketWaves[wave + 1])) {
      return <p className="bold">{intl('tickets_closed')}</p>
    }

    if (
      currentDate.isAfter(ticketWaves[wave]) &&
      currentDate.isBefore(ticketWaves[wave + 1]) &&
      ticketQuota &&
      ticketQuota.available
    ) {
      return (
        <p className="bold">
          <Link to={ticketLink} className="generic hover-underline">
            {intl('tickets_get_ticket')}
          </Link>
        </p>
      )
    }

    if (currentDate.isAfter(ticketWaves[wave]) && ticketQuota && ticketQuota.available === false) {
      return <p className="bold">{intl('tickets_closed')}</p>
    }

    return null
  }

  return (
    <Page theme={themes['tickets']}>
      <PageHero
        path={[{ text: <span className="bold">{intl('navigation_tickets')}</span> }, { text: props.page.header }]}
        navigation={[
          {
            title: intl('tickets_timeline'),
            to: '#timeline',
          },
          {
            title: intl('tickets_types_and_pricing'),
            to: '#types',
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
            <h2 className="spaced">{props.page.title}</h2>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.page.body }} />
          </div>

          <div className={css['right']}>
            <h2 className="spaced">{intl('tickets_raffle_important_dates')}</h2>
            <Snapshot
              items={[
                {
                  Icon: NoteIcon,
                  title: intl('tickets_raffle_discount_ticket_applications'),
                  // right: intl('tickets_raffle_discount_ticket_applications_dates'),
                  right: (
                    // <Link to="#types" style={{ textTransform: 'none' }}>
                    <span className="bold" style={{ display: 'inline' }}>
                      {intl('tickets_closed')}
                    </span>
                    // </Link>
                  ),
                },
                {
                  Icon: AuctionIcon,
                  title: intl('tickets_raffle_auction_begins'),
                  right: intl('tickets_raffle_auction_dates'),
                },
                {
                  Icon: CalendarIcon,
                  title: intl('tickets_raffle_ticket_sale_waves'),
                  right: (
                    // <Link to="#waves" style={{ textTransform: 'none' }}>
                    <span className="bold">{intl('tickets_raffle_ticket_sale_waves_dates')}</span>
                    // </Link>
                  ),
                },
                {
                  Icon: TicketIcon,
                  title: 'Tickets Sold out',
                  right: (
                    <Link to="https://tickets.devcon.org/" style={{ textTransform: 'none' }}>
                      <span className="bold">Ticket shop</span>
                    </Link>
                  ),
                },
              ]}
            />
          </div>
        </div>

        <h2 className="clear-top clear-bottom border-bottom margin-bottom" id="timeline">
          {intl('tickets_timeline')}
        </h2>

        <div className="clear-bottom">
          <h2 className="spaced">{intl('tickets_discounted')}</h2>

          <List
            connectedItems
            items={[
              {
                id: '1',
                title: (
                  <div className={css['timeline-item']}>
                    <div className={css['left']}>{intl('tickets_discount_applications_begins')}</div>
                    <div className={`${css['right']} bold`}>{intl('tickets_discount_applications_begins_date')}</div>
                    {/* <Link to="#types" className="generic hover-underline">
                      {intl('tickets_apply_now')}
                    </Link> */}
                    {/* <Link to="#types" className="generic hover-underline">
                      {intl('tickets_apply_now')}
                    </Link> */}
                  </div>
                ),
                indent: false,
                active: isAfterDate('2022-06-06'),
                body: '',
              },
              // {
              //   id: '1',
              //   title: (
              //     <div className={css['timeline-item']}>
              //       <div className={css['left']}>{intl('tickets_discount_applications_ends')}</div>
              //       {/* <div className={`${css['right']} bold`}>{intl('tickets_discount_applications_ends_date')}</div> */}
              //       {/* <Link to="#types" className="generic hover-underline">
              //         {intl('tickets_apply_now')}
              //       </Link> */}
              //     </div>
              //   ),
              //   indent: false,
              //   active: false, // isAfterDate('2022-06-06'),
              //   body: '',
              // },
              // {
              //   id: '2',
              //   title: (
              //     <div className={css['timeline-item']}>
              //       <div className={css['left']}>{intl('tickets_discount_applications_send_rolling_basis')}</div>
              //       <div className={`${css['right']} bold`}>{intl('tickets_discount_applications_review_process')}</div>
              //     </div>
              //   ),
              //   active: true,
              //   indent: false,
              //   body: '',
              // },
            ]}
          />
        </div>

        <div className="clear-bottom">
          <h2 className="spaced">{intl('tickets_raffle_auction_presale')}</h2>

          <List
            connectedItems
            items={[
              {
                id: '1',
                title: (
                  <div className={css['timeline-item']}>
                    <div className={css['left']}>{intl('tickets_raffle_auction_begins')}</div>
                    <div className={`${css['right']} bold`}>{intl('tickets_raffle_auction_begins_date')}</div>
                    <Link to="/raffle-auction" className="generic hover-underline">
                      {intl('tickets_raffle_information')}
                    </Link>
                  </div>
                ),
                indent: false,
                active: true,
                body: '',
              },
              {
                id: '2',
                title: (
                  <div className={css['timeline-item']}>
                    <div className={css['left']}>{intl('tickets_raffle_auction_ends')}</div>
                    <div className={`${css['right']} bold`}>{intl('tickets_raffle_auction_ends_date')}</div>
                  </div>
                ),
                indent: false,
                active: true,
                body: '',
              },
            ]}
          />
        </div>

        <div className="clear-bottom">
          <h2 id="waves" className="spaced">
            {intl('tickets_general_waves')}
          </h2>

          <List
            connectedItems
            items={[
              ...Object.keys(ticketWaves).map(i => {
                return {
                  id: i,
                  title: (
                    <div className={css['timeline-item']}>
                      <div className={css['left']}>Wave {i.padStart(2, '0')}</div>
                      <div className={`${css['right']} bold`}>
                        {ticketWaves[Number(i)].format('MMMM DD')} —&nbsp;
                        <span className={`${css['when']} font-sm`}>{ticketWaves[Number(i)].format('HH:mm')} UTC</span>
                      </div>
                      {renderTicketWaveInfo(Number(i))}
                    </div>
                  ),
                  active: isAfterDate(ticketWaves[Number(i)]?.format('YYYY-MM-DD')),
                  disabled: moment.utc().isAfter(ticketWaves[Number(i)]) && ticketQuota?.available === false,
                  indent: false,
                  body: '',
                }
              }),
              // {
              //   id: 'waitlist',
              //   title: (
              //     <div className={css['timeline-item']}>
              //       <div className={css['left']}>{intl('tickets_join_waitlist')}</div>
              //       <div className={`${css['right']} bold`}>{intl('tickets_ongoing')}</div>
              //       {/* <Link to="https://tickets.devcon.org/" className="generic hover-underline">
              //         {intl('tickets_shop')}
              //       </Link> */}
              //     </div>
              //   ),
              //   active: true,
              //   disabled: false,
              //   indent: false,
              //   body: '',
              // },
            ]}
          />
        </div>

        <div className="border-bottom clear-bottom margin-bottom border-top clear-top" id="types">
          <h2 className="spaced">{intl('tickets_types_and_pricing')}</h2>
          <p className="clear-bottom">{intl('tickets_accepted_payments')}</p>

          <div className={`clear-bottom ${css['tickets']}`}>
            <Ticket
              title="General Admission"
              price="$599"
              disabled
              number="01"
              description={<div>{intl('tickets_types_ga')}</div>}
              // tags={
              //   isAfterDate(ticketWaves[1]?.format('YYYY-MM-DD'))
              //     ? [
              //         {
              //           text: intl('tickets_ticket_waves'),
              //           link: '#timeline',
              //         },
              //       ]
              //     : [
              //         {
              //           text: intl('tickets_coming_soon'),
              //         },
              //       ]
              // }
              tags={[
                {
                  text: intl('tickets_closed'),
                },
              ]}
            />
            <Ticket
              title="Builder Discount*"
              link="https://docs.google.com/forms/d/e/1FAIpQLSd0Ce92qxcCsOOPAhPAs2mo87bzfaL5ezcKXpd5M20OuBUmMQ/viewform?usp=sf_link"
              price="$299"
              color="grey"
              number="02"
              description={<div>{intl('tickets_types_builder')}</div>}
              // tags={[
              //   {
              //     text: intl('tickets_apply_now'),
              //     link: 'https://docs.google.com/forms/d/e/1FAIpQLSd0Ce92qxcCsOOPAhPAs2mo87bzfaL5ezcKXpd5M20OuBUmMQ/viewform?usp=sf_link',
              //   },
              // ]}
              tags={[
                {
                  text: intl('tickets_closed'),
                },
              ]}
            />

            <Ticket
              title="Student Discount*"
              price="$149"
              color="grey"
              link="https://forms.gle/GB1JsruumAVMWZZVA"
              number="03"
              description={
                <div>
                  {intl('tickets_types_student')}
                  <br /> <br />
                  <span className="font-xxs">{intl('tickets_types_student_note')}</span>
                </div>
              }
              // tags={[
              //   {
              //     text: intl('tickets_apply_now'),
              //     link: 'https://forms.gle/GB1JsruumAVMWZZVA',
              //   },
              // ]}
              tags={[
                {
                  text: intl('tickets_closed'),
                },
              ]}
            />

            <Ticket
              title="LatAm Builder / Student*"
              // link="https://forms.gle/x6GHpq8MAZJCwwsq5"
              price={intl('tickets_extra_discount')}
              color="blue"
              withoutCurrency
              number="04"
              description={<div>{intl('tickets_types_latam')}</div>}
              // tags={[
              //   {
              //     text: 'Builder',
              //     link: 'https://forms.gle/x6GHpq8MAZJCwwsq5',
              //   },
              //   {
              //     text: 'Student',
              //     link: 'https://forms.gle/9L7BwqCP5hS1AT4HA',
              //   },
              // ]}
              tags={[
                {
                  text: intl('tickets_closed'),
                },
              ]}
            />

            <Ticket
              title="Volunteer*"
              link="https://forms.gle/mjHz1oyy2LiVCRvw7"
              price={intl('tickets_free')}
              withoutCurrency
              color="blue"
              number="05"
              description={<div>{intl('tickets_types_volunteer')}</div>}
              tags={[
                {
                  text: intl('tickets_closed'),
                },
              ]}
            />

            {props.sections['cta-scholar-applications'] && (
              <Ticket
                title={props.sections['cta-scholar-applications'].title}
                price="FREE"
                link="https://scholars.paperform.co/"
                withoutCurrency
                color="blue"
                number="06"
                description={
                  <div dangerouslySetInnerHTML={{ __html: props.sections['cta-scholar-applications'].body }} />
                }
                tags={[
                  {
                    text: intl('tickets_closed'),
                  },
                ]}
              />
            )}
          </div>

          <p className="italic">{intl('tickets_note_id_check')}</p>
        </div>
      </div>

      <div id="faq" className="section">
        <FAQ
          data={[{ id: 'something', title: 'Frequently Asked Questions', questions: props.faq }]}
          customCategoryTitle="FAQ"
          noSearch
        />
      </div>

      <div className="section">
        <Tags items={pageContext?.current?.tags} viewOnly />
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/tickets', context.locale)
  const faq = await GetFAQ(context.locale)
  const sections = await GetContentSections(['cta-scholar-applications'], context.locale)
  const ticketQuota = await GetTicketQuota()

  return {
    props: {
      ...globalData,
      page,
      faq: faq.filter((faq: any) => faq.category.id === 'ticketing'),
      sections,
      ticketQuota,
    },
    revalidate: DEFAULT_REVALIDATE_PERIOD,
  }
}
