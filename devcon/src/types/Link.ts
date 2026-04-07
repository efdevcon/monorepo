import React from 'react'

export interface Link {
  title: string
  url?: string
  type?: string
  onClick?: () => void
  logo?: string
  noLocale?: boolean
  links?: Link[]
  highlight?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}
