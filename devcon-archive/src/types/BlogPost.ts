export interface BlogPost {
  id: string
  title: string
  description: string
  date: Date
  author: string
  body: string
  slug?: string
  permaLink?: string
  imageUrl?: string
}
