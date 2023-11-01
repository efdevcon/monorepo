import React from 'react'
import css from './calls-to-action.module.scss'
import TicketBackground from 'assets/images/pages/tickets.svg'
import SpeakersBackground from 'assets/images/pages/speakers.svg'
import CallToAction from 'components/common/card/CallToActionCard'
import { ContentSection } from 'types/ContentSection'
import { useTranslations } from 'next-intl'

interface Props {
  [key: string]: ContentSection
  // ticketPresale: ContentSection
  // scholarApplications: ContentSection
  // speakerApplications: ContentSection
  // ticketsOnSaleNow: ContentSection
}

const CallsToAction = (props: Props) => {
  const intl = useTranslations()

  return (
    <div className={`section`}>
      <div className={`${css['container']} border-bottom clear-bottom`}>
        <CallToAction
          color="blue"
          title={props.ticketsOnSale.title}
          BackgroundSvg={TicketBackground}
          link="/tickets"
          linkText={intl('tickets_title')}
          meta={intl('cta_waves_ongoing')}
        >
          <div dangerouslySetInnerHTML={{ __html: props.ticketsOnSale.body }} />
        </CallToAction>

        {/* <CallToAction
          color="orange"
          title={props.speakerApplications.title}
          // tag="OPEN"
          BackgroundSvg={TicketBackground}
          link="/applications"
          linkText="Applications"
          meta="Applications are now closed"
        >
          <div dangerouslySetInnerHTML={{ __html: props.speakerApplications.body }} />
        </CallToAction> */}

        <CallToAction
          color="orange"
          title={props.scholarApplications.title}
          tag={intl('cta_closed')}
          BackgroundSvg={SpeakersBackground}
          link="/tickets"
          linkText={intl('cta_ticket_sales')}
          meta={intl('cta_applications_closed')}
        >
          <div dangerouslySetInnerHTML={{ __html: props.scholarApplications.body }} />
        </CallToAction>
      </div>
    </div>
  )
}

export default CallsToAction
