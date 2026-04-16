import React from 'react'
import FaqBg from './images/new/faq-bg.svg'
import { Faq } from 'components/common/faq'
import { BloomingEthFlower } from './BloomingEthFlower'

export const FaqSection = () => (
  <div className="relative bg-[#fff0e6] pt-12 sm:pt-20 pb-10 sm:pb-16 px-5 sm:px-8 md:px-16 flex flex-col items-center gap-6 sm:gap-8 overflow-hidden">
    <FaqBg
      aria-hidden
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] w-[1770px] max-w-none h-[810px] pointer-events-none select-none opacity-60"
    />

    <h2 className="relative text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b] text-center">
      Frequently asked questions
    </h2>

    <div className="relative w-full max-w-[760px]">
      <Faq />
    </div>

    <BloomingEthFlower className="relative w-[120px] h-[120px]" />
  </div>
)
