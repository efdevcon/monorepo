import React, { ReactNode } from 'react'
import { Header } from 'src/components/common/layouts/header'
import { Footer } from 'src/components/common/layouts/footer'
import css from './content.module.scss'
import { SEO } from 'src/components/domain/seo'

type LayoutProps = {
  children: ReactNode
  theme?: string
  style?: {
    [key: string]: any
  }
}

export default function Content({ children, theme, style }: LayoutProps) {
  let className = 'layout'

  if (theme) className += ` ${theme}`
  if (!theme) className += ` ${css['theme']}`

  return (
    <div className={className} style={style}>
      <SEO />
      <Header withStrip={true} withHero={false} />

      <div className="content">{children}</div>

      <Footer />
    </div>
  )
}
