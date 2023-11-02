import { NextPage } from 'next'
import Hero from 'common/components/hero'
import React from 'react'
import css from './code-of-conduct.module.scss'
import { CodeOfConduct } from 'pages'
import { Footer } from 'pages'

const CityGuide: NextPage = () => {
  return (
    <div className={css['code-of-conduct']}>
      <Hero
        className={css['hero']}
        autoHeight
        backgroundClassName={css['background']}
        backgroundTitle="Conduct"
        backgroundStyle="fill"
      >
        <></>
      </Hero>
      <div className="section">
        <CodeOfConduct />
      </div>
      <Footer />
    </div>
  )
}

export default CityGuide
