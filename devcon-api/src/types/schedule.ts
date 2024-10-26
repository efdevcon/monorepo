export interface Session {
  id: string
  sourceId: string
  title: string
  track: string
  featured: boolean
  speakers: string[]
  tags: string[]
  expertise: string
  audience: string
  similarity?: number
}
