import { FAQ } from './FAQ'

export interface Category {
  id: string
  title: string
  order?: number
  questions: Array<FAQ>
}
