import React from 'react'
import { Link } from 'components/common/link'
import footerRoad from './footer-road.png'
import css from './login.module.scss'
import Image from 'next/legacy/image'

export default function AccountFooter() {
  return (
    <div className={css['footer']}>
      <div className="section">
        <div className="content">
          <div className={css['text']}>
            <p className={css['description']}>
              Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity
              through our application if you choose to.
            </p>

            <Link className={css['link']} to="https://google.com">
              Learn more
            </Link>
            <Link className={css['link']} to="https://google.com">
              Terms & Conditions
            </Link>
          </div>
          <Image className={css['img']} src={footerRoad} alt="Man and dog on road" />
        </div>
      </div>
    </div>
  )
}
