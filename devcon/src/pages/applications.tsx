import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { Tags } from 'components/common/tags'
import { getGlobalData } from 'services/global'
import { GetContentSections, GetPage } from 'services/page'
import css from './applications.module.scss'
import { useTranslations } from 'next-intl'
import { Link } from 'components/common/link'
import { Button } from 'components/common/button'
import { Snapshot } from 'components/common/snapshot'
import PencilIcon from 'assets/icons/pencil.svg'
import CalendarIcon from 'assets/icons/calendar.svg'
import SelectionIcon from 'assets/icons/selection.svg'
import Image from 'next/legacy/image'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import Process from 'assets/images/speaker-process.png'

const ProcessOverview = () => {
  return (
    <SwipeToScroll scrollIndicatorDirections={{ left: true, right: true }}>
      <div className={css['process-container']}>
        <Image src={Process} alt="Speaker application process" />
      </div>
    </SwipeToScroll>
  )
}

export default pageHOC(function Applications(props: any) {
  const intl = useTranslations()
  const pageContext = usePageContext()

  return (
    <Page theme={themes['program']}>
      <PageHero
        path={[{ text: <span className="bold">{intl('program_title')}</span> }, { text: props.page.header }]}
        navigation={[
          {
            title: intl('program_application_process'),
            to: '#process',
          },
          {
            title: intl('program_application_guidelines'),
            to: '#guidelines',
          },
        ]}
      />

      <div className={css['layout']}>
        <div className="section">
          <div className={`${css['about']} clear-bottom border-bottom`} id="about">
            <div className={css['left']}>
              <div className="section-markdown">
                <h2>{props.page.title}</h2>
                <div dangerouslySetInnerHTML={{ __html: props.page.body }} />
              </div>
            </div>

            <div className={css['right']}>
              <h2 className="spaced">{intl('program_important_dates')}</h2>
              <Snapshot
                items={[
                  {
                    Icon: PencilIcon,
                    title: intl('program_applications_open'),
                    right: 'June 6th',
                  },
                  {
                    Icon: CalendarIcon,
                    title: intl('program_deadline_to_apply'),
                    right: 'Applications are now closed',
                  },
                  {
                    Icon: SelectionIcon,
                    title: intl('program_selection_process'),
                    right: (
                      <span>
                        <span className="font-xs">Before</span>
                        <span className="bold">July 30th</span>
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <div className={`${css['guidelines']} clear-bottom expand`} id="process">
            <div className="section">
              <div className="split">
                <h2 className="spaced clear-top">{intl('program_process_overview')}</h2>

                <span className="font-sm bold">{intl('program_drag_for_more')}</span>
              </div>

              <ProcessOverview />
            </div>
          </div>

          {props.sections['application-guidelines'] && (
            <div className={`${css['guidelines']} clear-bottom clear-top border-top`} id="guidelines">
              <h2 className="clear-bottom">{props.sections['application-guidelines'].title}</h2>
              <div
                className={`${css['custom-markdown']} section-markdown markdown`}
                dangerouslySetInnerHTML={{ __html: props.sections['application-guidelines'].body }}
              />
            </div>
          )}
        </div>

        <div className="section">
          <Tags items={pageContext?.current?.tags} viewOnly />
        </div>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('applications', context.locale)
  const sections = await GetContentSections(['application-guidelines'], context.locale)

  return {
    props: {
      ...globalData,
      page,
      sections,
    },
  }
}
