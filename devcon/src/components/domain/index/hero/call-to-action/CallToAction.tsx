import React from 'react'
import { Link } from 'components/common/link'
import css from './cta.module.scss'
import CtaSrc from 'assets/images/cta.svg'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import { useTranslations } from 'next-intl'

type CTAProps = {
  mobile?: boolean
  items?: any
}

export const CallToAction = (props: CTAProps) => {
  // const intl = useTranslations()

  let className = `${css['positional-wrapper']}`

  const callsToAction = props.items || (
    <>
      {/* <Link key="1" to="/tickets" allowDrag className={`no-select ${css['item']}`}>
        <p className="bold">Waitlist & Builder Ticket Applications Open —</p>
        <p className="font-sm">Read more</p>
      </Link> */}
      <Link to="/dips" key="2" allowDrag className={`no-select ${css['item']}`}>
        <p className="bold">DIPs —</p>
        <p className="font-sm">Help improve Devcon</p>
      </Link>
      <Link to="/bogota" key="4" allowDrag className={`no-select ${css['item']}`}>
        <p className="bold">City Guide —</p>
        <p className="font-sm">Find your way around Bogotá</p>
      </Link>
      <Link to="/devcon-week" key="3" allowDrag className={`no-select ${css['item']}`}>
        <p className="bold">Devcon Week —</p>
        <p className="font-sm">Devcon is more than just a conference</p>
      </Link>
    </>
  )

  return (
    <div className={className}>
      <div className={css['content']}>
        {/* <div className={css['icon']}>
          <CtaSrc />
        </div> */}

        <div className={css['swipe-wrapper']}>
          <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
            <div className={css['items']}>{callsToAction}</div>
          </SwipeToScroll>
        </div>
      </div>
    </div>
  )
}
