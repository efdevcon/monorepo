import { Tag } from './Tag'

export interface Page {
  title: string
  header?: String
  description?: string
  body?: string
  tags: Array<Tag>
  lang: string
  id: string
  slug: string
}
