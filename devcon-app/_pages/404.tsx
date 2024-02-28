import React from 'react'
import Image404 from 'assets/images/404.png'
import Image from 'next/image'
import css from './404.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { AppLayout } from 'components/domain/app/Layout'

const FourOhFour = pageHOC(() => {
  return (
    <AppLayout>
      <div className="section clear-top clear-bottom">
        <div className={css['container']}>
          <div className={css['center']}>
            <Image src={Image404} alt="Man looking for something" />
          </div>
        </div>
      </div>
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  // const page = await GetPage('/404')

  return {
    props: {
      ...globalData,
      // page,
    },
  }
}

export default FourOhFour
