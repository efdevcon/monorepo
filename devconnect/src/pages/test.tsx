import React from 'react'
import Head from 'next/head'
import NewSchedule from 'common/components/new-schedule'
import { Button } from 'lib/components/button'
const Test = () => {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>
      <div className="flex flex-col gap-4 text-black p-4">
        <div className="flex justify-between gap-4 items-end">
          <div className="text-lg font-bold">Devconnect 2025 - Buenos Aires</div>
          <Button className="" fill color="black-1">
            Login w. Zupass
          </Button>
        </div>
        <NewSchedule />
      </div>
    </>
  )
}

export default Test
