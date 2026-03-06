/* eslint-disable */
// @ts-nocheck
import React from 'react'
import { GetBlogs } from 'services/blogs'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Hero } from 'components/common/dc-8/hero/hero'
import { LandingPage } from 'components/domain/landing-page'
import css from './index.module.scss'
import themes from './themes.module.scss'
import { client } from '../../tina/__generated__/client'

export default function Index(props: any) {
  return (
    <div className={`${css['layout-default']} ${themes['index']}`}>
      <Header withHero />
      <Hero />

      <div className="z-[11] text-[rgba(255,255,255,0.8)] w-full relative">
        {/* <div
          className="bg-gradient-to-b from-[#1F296C] to-[#0E122F] absolute inset-0 w-full h-[calc(100%+50px)] translate-y-[-50px] overflow-hidden"
          data-type="gradient-background"
          style={
            {
              '--mask-stop': '50px',
              maskImage: 'linear-gradient(to bottom, transparent 0%, #1F296C var(--mask-stop))',
            } as React.CSSProperties
          }
        >
          <div
            className="absolute w-full top-0 left-0 right-0 h-[500px] translate-y-[-26%]"
            style={{
              background: 'radial-gradient(49.97% 43.6% at 50.03% 0%, #2C639B 57.53%, transparent 100%)',
            }}
          ></div>
        </div> */}

        <LandingPage />

        <Footer dark />
      </div>
    </div>
  )
}

export async function getStaticProps(context: any) {
  const content = await client.queries.pages({ relativePath: 'index.mdx' })
  const faq = await client.queries.pages({ relativePath: 'faq.mdx' })
  const programming = await client.queries.pages({ relativePath: 'programming.mdx' })

  return {
    props: {
      blogs: await GetBlogs(),
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
      faq: {
        variables: faq.variables,
        data: faq.data,
        query: faq.query,
      },
      programming: {
        variables: programming.variables,
        data: programming.data,
        query: programming.query,
      },
    },
    revalidate: 1 * 60 * 30,
  }
}
