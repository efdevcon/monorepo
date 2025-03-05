import React from 'react'
import Head from 'next/head'
import NewSchedule from 'common/components/new-schedule'

const Test = () => {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>
      <NewSchedule />
    </>
  )
}

export default Test
