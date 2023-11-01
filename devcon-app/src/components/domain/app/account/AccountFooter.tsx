import React from 'react'
import { Link } from 'components/common/link'
import footerRoad from './footer-road.png'
import css from './login.module.scss'
import Image from 'next/image'

export default function AccountFooter() {
  return (
    <div className="section">
      <div className="clear-top">
        <div className={css['footer']}>
          <div className={css['text']}>
            <p className={css['description']}>
              Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity
              through our application if you choose to.
            </p>

            <Link className={css['link']} to="https://ethereum.org/en/privacy-policy/">
              Privacy Policy
            </Link>
            <Link className={css['link']} to="https://ethereum.org/en/terms-of-use/">
              Terms of Use
            </Link>
            <Link className={css['link']} to="https://ethereum.org/en/cookie-policy/">
              Cookie Policy
            </Link>
          </div>
          {/* <div className={css['img']}>
            <Image className={css['image']} src={footerRoad} alt="Man and dog on road" />
          </div> */}
        </div>
      </div>

      <div className={css['background-footer']}>
        <Image className={css['image']} src={footerRoad} alt="Man and dog on road" />
      </div>
    </div>
  )
}
