import React, { ReactNode } from 'react'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import css from './page.module.scss'

type LayoutProps = {
  children: ReactNode
  theme?: string
  style?: {
    [key: string]: any
  }
  hideFooter?: boolean
  darkFooter?: boolean
  withHero?: boolean
}

export default function PageLayout({ children, theme, style, hideFooter, darkFooter, withHero = false }: LayoutProps) {
  let className = ''

  if (theme) className += ` ${theme}`
  if (!theme) className += ` ${css['theme']}`

  return (
    <div className={className} style={style}>
      <Header withHero={withHero} />

      {children}

      {!hideFooter && <Footer dark={darkFooter} />}
    </div>
  )
}
