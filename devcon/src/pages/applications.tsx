import React from 'react'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'
import ApplicationPage from 'components/domain/student-applications/ApplicationPage'

export default function Applications() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Student Discount — Devcon</title>
      </Head>

      <Page theme={themes['news']}>
        <PageHero heroBackground={HeroBackground} path={[{ text: 'Student Discount' }]} />

        <div className="section">
          <div className="content">
            <ApplicationPage />
          </div>
        </div>
      </Page>
    </>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
