import React from 'react'
import { Button } from 'lib/components/button'
import Link from 'lib/components/link'

interface Props {
  id?: string
  dark?: boolean
}

export const Newsletter = (props: Props) => {
  const buttonClass = props.dark
    ? 'bg-[rgba(77,89,199,1)] hover:bg-[#555EB1] text-white'
    : 'bg-[#2D3540] hover:bg-[#3D4550] text-white'

  return (
    <div className="flex flex-col items-start">
      {/* <p className="semi-bold">Subscribe to our newsletter</p> */}
      <Link
        href="https://paragraph.com/@efevents/subscribe"
        className={`font-semibold font-primary mb-1 transition-colors duration-300 rounded-full border backdrop-blur-[3px] px-7 py-3 ${buttonClass}`}
      >
        Subscribe for updates
      </Link>
    </div>
  )
}
