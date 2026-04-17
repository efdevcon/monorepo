import React from 'react'
import DC7 from './images/new/dc7-logo.svg'
import SEA from './images/new/dc7-sea.svg'
import Prism from './images/new/dc7-prism.svg'

export const DevconSEAStats = () => (
  <div className="bg-[#7235ed] relative py-10 sm:py-16 flex flex-col items-center justify-center gap-4 overflow-hidden">
    {/* Background DC7 SEA logo (low opacity) */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[507px] h-40 opacity-5 flex items-center pointer-events-none select-none">
      <DC7 aria-hidden className="absolute left-0 top-[27%] w-[42%] h-auto" />
      <Prism aria-hidden className="absolute left-[41%] top-0 w-[18%] h-auto" />
      <SEA aria-hidden className="absolute right-0 top-[27%] w-[39%] h-auto" />
    </div>

    <div className="relative flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-10 md:gap-20 items-center justify-center text-[#f9f8fa] text-center">
      <p className="text-2xl sm:text-3xl md:text-[40px] leading-[32px] sm:leading-[40px] tracking-[-0.5px]">
        <span className="font-extrabold">700+</span> speakers
      </p>
      <p className="text-2xl sm:text-3xl md:text-[40px] leading-[32px] sm:leading-[40px] tracking-[-0.5px]">
        <span className="font-extrabold">600+</span> sessions
      </p>
      <p className="text-2xl sm:text-3xl md:text-[40px] leading-[32px] sm:leading-[40px] tracking-[-0.5px]">
        <span className="font-extrabold">12K+</span> attendees
      </p>
    </div>
  </div>
)
