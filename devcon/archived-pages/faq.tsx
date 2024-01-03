import React from 'react'
import { FAQ } from 'components/domain/faq'
import { PageHero } from 'components/common/page-hero'
import { Category } from 'types/Category'
import Page from 'components/common/layouts/page'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { getGlobalData } from 'services/global'
import { GetPage, GetCategories } from 'services/page'
import { Tags } from 'components/common/tags'
import { useTranslations } from 'next-intl'

export default pageHOC(function FaqTemplate(props: any) {
  const pageContext = usePageContext()
  const intl = useTranslations()

  return (
    <Page theme={themes['about']}>
      <PageHero
        path={[{ text: <span className="bold">{intl('about_title')}</span> }, { text: props.page.header }]}
        navigation={props.faq.map((category: Category) => {
          return { title: category.title, to: `#${category.id}` }
        })}
      />

      <div className="section">
        <FAQ data={props.faq} />
        <Tags items={pageContext?.current?.tags} viewOnly />
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/faq', context.locale)

  return {
    props: {
      ...globalData,
      page,
      faq: await GetCategories(context.locale),
    },
  }
}
