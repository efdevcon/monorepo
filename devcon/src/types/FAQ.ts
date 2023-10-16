import { Category } from './Category'

export interface FAQ {
  id: string
  title: string
  body: string
  category?: Category
  order?: number
}
