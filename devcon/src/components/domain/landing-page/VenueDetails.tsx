import React from 'react'
import Image from 'next/image'
import JwcLogo from 'assets/images/dc-8/jio-world-centre.png'
import { useTranslations } from 'next-intl'
import { AddToCalendarPopover } from './AddToCalendarButton'

const JWC_URL = 'https://www.jioworldcentre.com/'
const MAP_URL =
  'https://www.google.com/maps?vet=10CAAQoqAOahcKEwiwsoiy-sqUAxUAAAAAHQAAAAAQHw..i&pvq=OiUweDNiZTdjOTFjZTU1NjYxNjc6MHgzOTliZGIwNmZhYjY4YTdl&um=1&ie=UTF-8&fb=1&gl=uk&sa=X&ftid=0x3be7c91ce5566167:0x399bdb06fab68a7e'

export const VenueDetails = () => {
  const t = useTranslations('home.venue')
  return (
    <div className="bg-[#ffa366] flex flex-col md:flex-row items-center justify-center px-6 py-3 text-[#221144] text-sm leading-5 gap-x-4 gap-y-1 text-center">
      <span className="flex items-center gap-2">
        <strong className="font-bold">{t('label_venue')}</strong>
        <a
          href={JWC_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('name')}
          className="inline-flex items-center shrink-0"
        >
          <Image src={JwcLogo} alt={t('name')} className="h-7 w-auto shrink-0" />
        </a>
      </span>
      {/* Dates: hidden on tablet and below. Click opens the add-to-calendar popover. */}
      <span className="hidden lg:inline">
        <strong className="font-bold">{t('label_dates')}</strong>{' '}
        <AddToCalendarPopover popoverPosition="bottom">
          {({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer hover:underline focus-visible:underline focus:outline-none"
            >
              {t('dates')}
            </button>
          )}
        </AddToCalendarPopover>
      </span>
      <span>
        {/* "Address:" label hidden on tablet and below */}
        <strong className="font-bold hidden lg:inline">{t('label_address')}</strong>{' '}
        <a
          href={MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline focus-visible:underline focus:outline-none"
        >
          {t('address')}
        </a>
      </span>
    </div>
  )
}
