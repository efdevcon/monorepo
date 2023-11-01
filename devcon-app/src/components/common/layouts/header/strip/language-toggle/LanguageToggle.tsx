import React from 'react'
import { Link } from 'components/common/link'
import { useRouter } from 'next/router'
import IconLanguage from 'assets/icons/language.svg'
import css from './language-toggle.module.scss'

export function LanguageToggle() {
  const router = useRouter()

  return (
    <div id="language-toggle" className={css['language-toggle']}>
      <IconLanguage style={{ fontSize: '14px' }} />
      <p>
        <Link to={`${router.asPath}`} locale="en">
          EN
        </Link>
        &nbsp;
        |
        &nbsp;
        <Link to={`${router.asPath}`} locale="es">
        ES
      </Link>
      </p>
    </div>
  )
}
