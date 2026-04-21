import React from 'react'
import JwcLogo from './images/jwc-logo.svg'
import { useTranslations } from 'next-intl'

export const VenueDetails = () => {
  const t = useTranslations('home.venue')
  return (
    <div className="bg-[#ffa366] flex flex-col md:flex-row items-center justify-center px-6 py-3 text-[#221144] text-sm leading-5 gap-x-4 gap-y-1 text-center">
      <span className="flex items-center gap-1.5">
        <strong className="font-bold">{t('label_venue')}</strong>
        <JwcLogo className="w-7 h-7 inline-block shrink-0" />
        <span className="font-bold tracking-wide">{t('name')}</span>
      </span>
      {/* Dates: hidden on tablet and below */}
      <span className="hidden lg:inline">
        <strong className="font-bold">{t('label_dates')}</strong> <span>{t('dates')}</span>
      </span>
      <span>
        {/* "Address:" label hidden on tablet and below */}
        <strong className="font-bold hidden lg:inline">{t('label_address')}</strong> <span>{t('address')}</span>
      </span>
    </div>
  )
}
