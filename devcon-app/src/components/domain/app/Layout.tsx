import React, { PropsWithChildren } from 'react'
import { BottomNav } from 'components/domain/app/navigation'
import css from './app.module.scss'
import { Header } from 'components/common/layouts/header'
import useGetElementHeight from 'hooks/useGetElementHeight'

export const AppLayout = (props: PropsWithChildren) => {
  const headerHeight = useGetElementHeight('header')
  const upperNavHeight = useGetElementHeight('inline-nav')
  const lowerNavHeight = useGetElementHeight('bottom-nav')

  return (
    <>
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
      </div>
    </>
  )
}
