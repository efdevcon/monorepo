import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { BlogOverview } from 'components/domain/blog-overview'
import { getGlobalData } from 'services/global'
import { GetPage } from 'services/page'
import { GetBlogs } from 'services/blogs'
import { Tags } from 'components/common/tags'
import { usePageContext } from 'context/page-context'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'

export default pageHOC(function BlogsTemplate(props: any) {
  const pageContext = usePageContext()

  return (
    <Page theme={themes['news']}>
      <PageHero heroBackground={HeroBackground} />

      <div className="section">
        <BlogOverview blogs={props.blogs} />
        {/* <Tags items={pageContext?.current?.tags} viewOnly /> */}
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/blogs', context.locale)

  return {
    props: {
      ...globalData,
      page,
      blogs: await GetBlogs(),
    },
  }
}
