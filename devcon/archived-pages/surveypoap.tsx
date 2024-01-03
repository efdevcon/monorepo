import React from 'react'
import Page from 'components/common/layouts/page'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { GetFAQ, GetPage, GetContentSections } from 'services/page'
import { getGlobalData } from 'services/global'

export default pageHOC(function SurveyPoap(props: any) {
  return (
    <Page>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20vh' }}>
        <p>Please check back after Nov 30th.</p>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/404')

  return {
    props: {
      ...globalData,
      page
    },
  }
}
