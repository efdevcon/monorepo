import React from 'react'
import Link from 'lib/components/link'

export const Newsletter = () => {
  return (
    <div className="flex flex-col items-start">
      <Link
        href="https://paragraph.com/@efevents/subscribe"
        className="inline-flex items-center gap-2 font-bold text-base text-[#f9f8fa] bg-[#7235ed] hover:opacity-90 transition-opacity rounded-full px-8 py-4 whitespace-nowrap"
      >
        Subscribe for updates
      </Link>
    </div>
  )
}
