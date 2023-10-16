import { Tag } from "./Tag";

export interface NewsItem {
  id?: string
  date: number
  author?: string
  url?: string
  tweetID?: string
  title: string
  description?: string
  tags?: Tag[]
  imageUrl?: string
}
