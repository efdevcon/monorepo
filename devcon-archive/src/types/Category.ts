import { FAQ } from './FAQ'

export interface Category {
  id: string
  title: string
  questions: Array<FAQ>
}
