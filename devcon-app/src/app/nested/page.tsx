import React, { useContext } from 'react'
import { Link } from 'components/common/link'
// import DataContext from '../data-context'

const Page = (props: any) => {
  // const { sessions } = useContext(DataContext)

  console.log(props, 'props nested')

  return (
    <div>
      <Link href="/">Main</Link>
      {/* {Object.keys(props)} */}
      {/* <p>{sessions.length}</p> */}
    </div>
  )
}

export default Page
