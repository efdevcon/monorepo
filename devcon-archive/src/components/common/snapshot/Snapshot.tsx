import React from 'react'
import moment from 'moment-timezone'
import css from './snapshot.module.scss'
import { useIntl } from 'gatsby-plugin-intl'

import IconClock from 'src/assets/icons/icon_clock.svg'
import IconCurrency from 'src/assets/icons/icon_currency.svg'
import IconGlobe from 'src/assets/icons/icon_globe.svg'
import IconSun from 'src/assets/icons/icon_sun.svg'
import IconWater from 'src/assets/icons/icon_water.svg'
import { Link } from '../link'

export function Snapshot() {
  const intl = useIntl()

  return (
    <div className={css['container']}>
      <ul className={css['list']}>
        <li className={css['list-item']}>
          <IconClock />
          <span className={css['label']}>{intl.formatMessage({ id: 'snapshot_timezone' })}:</span>
          <span>GMT -5</span>
          <span>{moment().tz('America/Bogota').format('hh:mm A')}</span>
        </li>
        <li className={css['list-item']}>
          <IconCurrency />
          <span className={css['label']}>{intl.formatMessage({ id: 'snapshot_currency' })}:</span>
          <span>{intl.formatMessage({ id: 'snapshot_colombian_peso' })}</span>
          <a href="https://www.xe.com/currency/cop-colombian-peso">
            {intl.formatMessage({ id: 'snapshot_exchange_rate' })}
          </a>
        </li>
        <li className={css['list-item']}>
          <IconGlobe />
          <span className={css['label']}>{intl.formatMessage({ id: 'snapshot_language' })}:</span>
          <span>{intl.formatMessage({ id: 'snapshot_spanish' })}</span>
          <a href="https://www.worldtravelguide.net/guides/south-america/colombia/history-language-culture/">
            {intl.formatMessage({ id: 'snapshot_language_guide' })}
          </a>
        </li>
        <li className={css['list-item']}>
          <IconSun />
          <span className={css['label']}>{intl.formatMessage({ id: 'snapshot_temperature' })}:</span>
          <span>8 TO 20 °C / 46.4 to 68.0 °F</span>
          <a href="https://www.worldtravelguide.net/guides/south-america/colombia/travel-by/">
            {intl.formatMessage({ id: 'snapshot_packing_tips' })}
          </a>
        </li>
        <li className={css['list-item']}>
          <IconWater />
          <span className={css['label']}>{intl.formatMessage({ id: 'snapshot_water' })}:</span>
          <span>{intl.formatMessage({ id: 'snapshot_tap_water' })}</span>
          <a href="#FAQ">{intl.formatMessage({ id: 'snapshot_FAQs' })}</a>
        </li>
      </ul>

      <Link
        indicateExternal
        className={`font-md bold font-secondary text-primary text-uppercase ${css['primary']}`}
        to={'https://goo.gl/maps/Ee3dz2XbQfbNKeR36'}
      >
        Devcon Google Map
      </Link>
    </div>
  )
}
