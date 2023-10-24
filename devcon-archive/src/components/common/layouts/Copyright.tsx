import React from 'react'
import { useIntl } from 'gatsby-plugin-intl'
import { COPYRIGHT_NOTICE } from 'src/utils/constants'

export const Copyright = () => {
  const intl = useIntl()

  return (
    <div className="font-xs">
      <p className="bold">{intl.formatMessage({ id: 'rtd_footer' })}</p>
      <p>{COPYRIGHT_NOTICE}</p>
    </div>
  )
}
