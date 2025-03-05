import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from '../themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { usePageContext } from 'context/page-context'
import { NewsOverview } from 'components/domain/news/overview'
import { Tags } from 'components/common/tags'
import { getGlobalData } from 'services/global'
import { GetPage } from 'services/page'
import getNews from 'services/news'
// import { Button } from 'components/common/button'
import { Button } from 'lib/components/button'
import ChevronLeft from 'assets/icons/chevron_left.svg'
import ChevronRight from 'assets/icons/chevron_right.svg'
import css from './news.module.scss'
import { Link } from 'components/common/link'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'

const limit = 10

const ConditionalLink = ({ disabled, ...props }: any) => {
  if (!disabled) {
    return <Link {...props}>{props.children}</Link>
  }

  return props.children
}

export default pageHOC(function NewsTemplate(props: any) {
  const pageContext = usePageContext()

  let className = `border-2`

  const canBack = props.pagination.currentPage > 0
  const canNext = props.pagination.currentPage + 1 < props.pagination.totalPages

  const prevPage = props.pagination.currentPage === 1 ? `/news` : `/news/${props.pagination.currentPage - 1}`
  const nextPage = `/news/${props.pagination.currentPage + 1}`

  return (
    <Page theme={themes['news']}>
      <PageHero heroBackground={HeroBackground} />

      <div className="section">
        <NewsOverview newsItems={props.news} />

        <div className={`${css['pagination']} clear-bottom`}>
          <ConditionalLink disabled={!canBack} to={prevPage}>
            <Button disabled={!canBack} className={className} circle aria-label="Previous page">
              <ChevronLeft />
            </Button>
          </ConditionalLink>

          <ConditionalLink disabled={!canNext} to={nextPage}>
            <Button disabled={!canNext} className={className} circle aria-label="Next page">
              <ChevronRight />
            </Button>
          </ConditionalLink>
        </div>

        <Tags items={pageContext?.current?.tags} viewOnly />
      </div>
    </Page>
  )
})

export async function getStaticPaths(context: any) {
  const news = await getNews(context.locale)

  const nItems = news.length

  return {
    paths: context.locales
      .filter((locale: string) => locale !== 'default')
      .map((locale: string) => {
        const paths = []
        let nPages = 0

        while (nItems > limit * nPages) {
          paths.push({ params: { page: nPages.toString() }, locale })

          nPages++
        }

        return paths
      })
      .flat(),
    fallback: false,
  }
}

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/news', context.locale)
  const news = await getNews(context.locale)

  const isIndex = !context?.params?.page

  let range

  if (isIndex) {
    range = [0, limit]
  } else {
    const offset = context.params.page * limit

    range = [offset, offset + limit]
  }

  return {
    props: {
      ...globalData,
      page,
      news: news.slice(...range),
      pagination: {
        currentPage: isIndex ? 0 : parseInt(context.params.page),
        totalPages: Math.ceil(news.length / limit),
      },
    },
    revalidate: 1 * 60 * 30,
  }
}
