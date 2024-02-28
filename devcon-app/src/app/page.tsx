'use client'
import React, { useContext } from 'react'
import { Link } from 'components/common/link'
import DataContext from './data-context'

const Page = (props: any) => {
  // const sessions = await GetSessions()
  // const speakers = await GetSpeakers()

  // const data = await getData()
  const { sessions } = useContext(DataContext)

  console.log(sessions.length, 'length of sessions')
  // console.log(props.sessions, 'sessions')

  return (
    <div>
      <Link href="/nested">Nested page</Link>
      {/* <p>Speaker length: {speakers.length}</p>*/}
      <p>Sessions length: {sessions.length}</p>
    </div>
  )
}

export default Page
