import React from 'react'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { Header } from 'components/common/layouts/header'
import { Hero } from 'components/domain/index/hero'
import { Footer } from 'components/common/layouts/footer'
import css from './sea-local.module.scss'
import { getGlobalData } from 'services/global'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesSea_Local, PagesQuery } from '../../tina/__generated__/types'
import RichText from 'lib/components/tina-cms/RichText'

export default pageHOC(function SeaLocal(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesSea_Local

  return (
    <div className={`${css['layout-default']} ${themes['index']}`}>
      <Header withStrip withHero />
      <Hero />
      <div className="section z-10 bg-white py-8">
        <RichText content={pages.content}></RichText>
      </div>

      <Footer />
    </div>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const content = await client.queries.pages({ relativePath: 'sea_local.mdx' })

  return {
    props: {
      ...globalData,
      page: {},
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}
