import React from 'react'
import { graphql } from 'gatsby'
import Content from 'src/components/common/layouts/content'
import { pageHOC } from 'src/context/pageHOC'
import themes from './themes.module.scss'
import { PageContentSection } from './page-content-section'
import { PageHero } from 'src/components/common/page-hero'
import { Link } from 'src/components/common/link'
import * as JsSearch from 'js-search'
import { useLocation } from '@reach/router'
import { InputForm } from 'src/components/common/input-form'
import { SearchItem } from 'src/types/SearchItem'

export default pageHOC(function SearchTemplate({ pageContext }: any) {
  const data = pageContext
  const searchParams = new URLSearchParams(useLocation().search)
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get('q') || '')
  const [results, setResults] = React.useState<Array<SearchItem>>([])

  const id = 'slug'
  const search = new JsSearch.Search(id)
  search.tokenizer = new JsSearch.StopWordsTokenizer(new JsSearch.SimpleTokenizer())
  search.indexStrategy = new JsSearch.AllSubstringsIndexStrategy()
  search.sanitizer = new JsSearch.LowerCaseSanitizer()
  search.searchIndex = new JsSearch.TfIdfSearchIndex(id)

  search.addIndex('id')
  search.addIndex('title')
  search.addIndex('description')
  search.addIndex('body')
  search.addIndex('tags')
  search.addDocuments(data.allSearchData)

  React.useEffect(() => {
    const items = search.search(searchQuery) as Array<SearchItem>
    setResults(items)
  }, [search, searchQuery])

  function getUrl(i: any) {
    if (i.type === 'pages') {
      return i.slug
    }

    return `/${i.lang}/${i.type}/#${i.id}`
  }

  function onChange(value: string) {
    if (value) {
      setSearchQuery(value)
    }
  }

  return (
    <Content theme={themes['light-blue']}>
      <PageHero />

      <PageContentSection>
        <InputForm id='input-form_search_page' label={'Search'} onChange={onChange} placeholder="Search..." defaultValue={searchQuery} />

        <h2>Search Results</h2>
        {searchQuery}

        {results && results.length > 0 && (
          <ul>
            {results.map((i: any) => {
              return (
                <li key={i.slug}>
                  <Link to={getUrl(i)}>
                    {i.title} ({i.type})
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </PageContentSection>
    </Content>
  )
})

export const query = graphql`
  query ($slug: String!, $language: String!) {
    ...Page
    ...NavigationData
    ...Notification
  }
`
