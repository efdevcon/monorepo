import React from 'react'
import { Link } from 'components/common/link'
import css from './login.module.scss'

export default function AccountFooter() {
  return (
    <div className={`${css['footer']} text-sm`}>
      <div className={css['text']}>
        <p className={css['description']}>
          Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity through
          our application if you choose to.
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
    </div>
  )
}
