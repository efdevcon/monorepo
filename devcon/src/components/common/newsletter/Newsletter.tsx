import React from 'react'
import { Button } from 'lib/components/button'
import Link from 'lib/components/link'

interface Props {
  id?: string
}

export const Newsletter = (props: Props) => {
  return (
    <div className="flex flex-col items-start">
      {/* <p className="semi-bold">Subscribe to our newsletter</p> */}
      <Link
        href="https://paragraph.com/@efevents/subscribe"
        className="font-semibold font-primary mb-1 bg-[rgba(77,89,199,1)] hover:bg-[#555EB1] transition-colors duration-300 rounded-full border border-white backdrop-blur-[3px] px-7 py-3"
      >
        Subscribe for updates
      </Link>
    </div>
  )
}
