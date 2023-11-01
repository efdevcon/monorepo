import { useAccountContext } from 'context/account-context'
import { useRouter } from 'next/router'
import { Component } from 'react'
import css from './private.module.scss'

export const PrivatePage = (props: any) => {
  const router = useRouter()
  const accountContext = useAccountContext()
  const loggedIn = !!accountContext.account

  if (!loggedIn && accountContext.loading) {
    return (
      <div className={css['container']}>
        <div className={css['spinner']}></div>
      </div>
    )
  }

  if (!loggedIn && location?.pathname !== `/login`) {
    router.push('/login' + location?.search)
    return null
  }

  return props.children || <Component {...props} />
}
