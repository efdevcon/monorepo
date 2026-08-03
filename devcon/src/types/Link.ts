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
  // On a 'header' link: lay out that section's items in N columns (desktop only)
  columns?: number
  // On a top-level nav item: desktop dropdown width in px (default 320)
  foldoutWidth?: number
}
