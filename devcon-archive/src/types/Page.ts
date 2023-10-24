import { Tag } from './Tag'

export interface Page {
  title: string
  description?: string
  body?: string
  template: string
  translationVerified?: boolean
  tags: Array<Tag>
  lang: string
  id: string
  slug: string
}
