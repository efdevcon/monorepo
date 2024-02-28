import React from 'react'
import { AccountContextProvider } from 'context/account-context-provider'
import { BottomNav } from 'components/domain/app/navigation'
import css from './app.module.scss'
import { Header } from 'components/common/layouts/header'
import { SEO } from 'components/domain/seo'
import { useAccountContext } from 'context/account-context'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { AppContext } from 'context/app-context'
import { GetSessions, GetSpeakers } from 'services/programming'

type LayoutProps = {
  children: React.ReactChild | React.ReactChild[]
}

export const AppLayout = async (props: LayoutProps) => {
  const accountContext = useAccountContext()
  // const loggedIn = !!accountContext.account

  const headerHeight = useGetElementHeight('header')
  const upperNavHeight = useGetElementHeight('inline-nav')
  const lowerNavHeight = useGetElementHeight('bottom-nav')

  const sessions = await GetSessions()
  const speakers = await GetSpeakers()

  return (
    <AppContext>
      <AccountContextProvider>
        <div
          className={css['app']}
          style={
            {
              '--header-height': `${headerHeight}px`,
              '--app-nav-upper-height': `${upperNavHeight || 49}px`,
              '--app-nav-lower-height': `${lowerNavHeight}px`,
            } as any
          }
        >
          <Header isApp className={css['header']} withStrip={false} withHero={false} />

          {props.children}

          <BottomNav />

          {/* {loggedIn && <BottomNav location={location} />} */}
        </div>
      </AccountContextProvider>
    </AppContext>
  )
}
