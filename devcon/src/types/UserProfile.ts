export interface UserProfile {
  id: string
  slug: string
  lang: string
  name: string
  role: string
  description: string
  organization?: string
  country?: string
  imageUrl?: string
}
