import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { BlogOverview } from 'components/domain/blog-overview'
import { GetBlogs } from 'services/blogs'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'

export default function BlogsTemplate(props: any) {
  return (
    <Page theme={themes['news']}>
      <PageHero heroBackground={HeroBackground} path={[{ text: 'Blog Posts' }]} title="Devcon Blog" />

      <div className="section">
        <BlogOverview blogs={props.blogs} />
        {/* <Tags items={pageContext?.current?.tags} viewOnly /> */}
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {
      blogs: await GetBlogs(),
    },
  }
}
