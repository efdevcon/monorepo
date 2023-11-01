export interface DevconEdition {
  id: string
  number: number
  title: string
  description: string
  location: string
  startDate?: number
  endDate?: number
  imageUrl: string
  links: Array<{
    title: string
    url: string
  }>
}
