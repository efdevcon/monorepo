import React from 'react'
import { PageHero } from 'components/common/page-hero'
import { FAQ } from 'components/domain/faq'
import Page from 'components/common/layouts/page'
import themes from './themes.module.scss'
import css from './satellite.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { useTranslations } from 'next-intl'
import { GetFAQ, GetPage, GetContentSections } from 'services/page'
import { getGlobalData } from 'services/global'
import { toHtml } from 'utils/markdown'
import { Tags } from 'components/common/tags'
import { Button } from 'components/common/button'
import { Link } from 'components/common/link'
export default pageHOC(function SatelliteEvents(props: any) {
  const intl = useTranslations()
  const pageContext = usePageContext()
  const faqs = props.faqs.filter((faq: any) => faq.category.id === 'satellite')

  return (
    <Page theme={themes['bogota']}>
      <PageHero
        path={[{ text: <span className="bold">Event</span> }, { text: props.page.header }]}
        navigation={[
          {
            title: props.page.header,
            to: '#overview',
          },
          {
            title: props.sections['organize-a-satellite-event'].title,
            to: '#how-to-organize',
          },
          {
            title: 'FAQ',
            to: '#FAQ',
          },
        ]}
      />

      <div className="section">
        <div className="two-columns clear-bottom" id="overview">
          <div className="left section-markdown">
            <h2 className="spaced">{props.page.title}</h2>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.page.body }} />
          </div>

          <div className="right section-markdown">
            <h2 className="spaced">{props.sections['satellite-info'].title}</h2>
            <div className="markdown" dangerouslySetInnerHTML={{ __html: props.sections['satellite-info'].body }} />
          </div>
        </div>

        {props.sections['organize-a-satellite-event'] && (
          <div id="how-to-organize">
            <h2 className="spaced" id="specs">
              {props.sections['organize-a-satellite-event'].title}
            </h2>

            <div
              className={`markdown markdown clear-bottom`}
              dangerouslySetInnerHTML={{ __html: props.sections['organize-a-satellite-event'].body }}
            />

            <div className={`clear-bottom`}>
              <Link to="https://forum.devcon.org/t/launching-devcon-satellites/1364">
                <Button className={`black`}>Learn More</Button>
              </Link>
            </div>
          </div>
        )}

        <section id="FAQ" className="clear-top">
          <FAQ
            data={[{ id: 'something', title: 'Frequently Asked Questions', questions: faqs }]}
            customCategoryTitle="FAQ"
            noSearch
          />
        </section>

        <Tags items={pageContext?.current?.tags} viewOnly />
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('satellites', context.locale)
  const sections = await GetContentSections(['organize-a-satellite-event', 'satellite-info'], context.locale)

  return {
    props: {
      ...globalData,
      page,
      faqs: await GetFAQ(context.locale),
      sections,
    },
  }
}
