import React from 'react'
import { useTranslations } from 'next-intl'
import { COPYRIGHT_NOTICE } from 'utils/constants'

export const Copyright = () => {
  const intl = useTranslations()

  return (
    <div className="font-xs">
      <p className="bold">Crafted with passion ✨ in the Infinite Garden.</p>
      <p>{COPYRIGHT_NOTICE}</p>
    </div>
  )
}
