import React from 'react'
import Head from 'next/head'
import NewSchedule from 'common/components/new-schedule'
import { Button } from 'lib/components/button'
import Login from 'common/components/login'
import { useAccountContext } from 'context/account-context'
import Timeline from 'common/components/new-schedule/timeline'
import { dummyEvents } from 'common/components/new-schedule/dummy-data'
import { useCalendarStore } from 'store/calendar'

const Test = () => {
  const user = useAccountContext()
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Head>
      <div className="flex flex-col gap-4 text-black p-4">
        <div className="flex justify-between gap-4 items-end">
          {/* <div className="text-lg font-bold">Devconnect 2025 - Buenos Aires</div>
          <Button className="" fill color="black-1">
            Login w. Zupass
          </Button> */}
          {/* <Login />
          <div>Hello, {user.account?.email}</div>
          <Button className="" fill color="black-1" onClick={() => user.logout()}>
            Logout
          </Button> */}
        </div>
        <NewSchedule />

        {/* <Timeline events={dummyEvents} /> */}
      </div>
    </>
  )
}

export default Test
