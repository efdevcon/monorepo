import React from 'react'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
// import { Header } from 'components/common/layouts/header'
// import { Hero } from 'components/domain/index/hero'
// import { Footer } from 'components/common/layouts/footer'
// import css from './lantern.module.scss'

export default pageHOC(function SeaLocal(props: any) {
  return (
    <div className={`${themes['index']} flex items-center justify-center h-screen`}>
      {/* <Header withStrip withHero /> */}

      <h1>Check back later for lantern instructions.</h1>

      {/* <Footer /> */}
    </div>
  )
})

export async function getStaticProps(context: any) {
  return {
    props: {
      page: {},
    },
  }
}
