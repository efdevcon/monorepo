import React, { ReactNode } from 'react'
import { Header } from 'src/components/common/layouts/header'
import { Footer } from 'src/components/common/layouts/footer'
import { Hero } from 'src/components/domain/hero'
import './default.module.scss'

type LayoutProps = {
  children: ReactNode
  // navigationData: any
  // latestNewsItem: NewsItem
  // location: any
}

export default function Default({ children }: LayoutProps) {
  return (
    <div className="layout-default">
      {/* <PageContextProvider navigationData={navigationData} latestNewsItem={latestNewsItem} location={location}> */}
      <Header withStrip={true} withHero={true} />
      <Hero />

      <div className="content">{children}</div>

      <Footer />
      {/* </PageContextProvider> */}
    </div>
  )
}
