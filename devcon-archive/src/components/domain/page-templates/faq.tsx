import React, { useState } from 'react'
import { graphql } from 'gatsby'
import { FAQ } from 'src/components/domain/faq'
import { PageHero } from 'src/components/common/page-hero'
import { ToFaqData } from 'src/components/domain/faq/queryMapper'
import { Category } from 'src/types/Category'
import { Search } from 'src/components/domain/faq/search'
import Content from 'src/components/common/layouts/content'
import css from './templates.module.scss'
import themes from './themes.module.scss'

import AskDeva from 'src/assets/images/ask-deva.png'
import { pageHOC } from 'src/context/pageHOC'
import { PageContentSection } from './page-content-section'
import { usePageContext } from 'src/context/page-context'

export default pageHOC(function FaqTemplate({ data, location }: any) {
  const pageContext = usePageContext()
  const faq = ToFaqData(data)
  const [searchFilter, setSearchFilter] = useState('')

  return (
    <Content theme={themes['green']}>
      <PageHero
        navigation={faq.map((category: Category) => {
          return { title: category.title, to: `#${category.id}` }
        })}
      />

      <PageContentSection>
        <section id="contribute" className={css['section']}>
          <h3 className="spaced">{pageContext?.current?.title}</h3>
          <div className={css['container']}>
            <div className={css['left-70']}>
              <div className={css['description']}>
                <p dangerouslySetInnerHTML={{ __html: pageContext?.current?.body ?? '' }} />
              </div>

              <Search onSearch={e => setSearchFilter(e)} />
            </div>
            <div className={css['right-deva']}>
              <img src={AskDeva} alt="Ask Deva" />
            </div>
          </div>
        </section>

        <FAQ data={faq} filter={searchFilter} />
      </PageContentSection>
    </Content>
  )
})

export const query = graphql`
  query ($slug: String!, $language: String!) {
    ...Page
    ...NavigationData
    ...Notification
    ...Categories
    ...FAQs
  }
`
