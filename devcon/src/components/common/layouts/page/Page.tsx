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
}

export default function PageLayout({ children, theme, style }: LayoutProps) {
  let className = ''

  if (theme) className += ` ${theme}`
  if (!theme) className += ` ${css['theme']}`

  return (
    <div className={className} style={style}>
      <Header withStrip={true} withHero={false} />

      {children}

      <Footer />
    </div>
  )
}
