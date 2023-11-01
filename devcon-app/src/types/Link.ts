export interface Link {
  title: string
  url: string
  type: string
  logo?: string
  noLocale?: boolean
  links?: Link[]
  highlight?: string
}
