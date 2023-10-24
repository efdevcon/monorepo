export interface DevconEdition {
  id: string
  number: number
  title: string
  description: string
  location: string
  startDate?: Date
  endDate?: Date
  imageUrl: string
  image1: any
  image2: any
  image3: any
  imageTitle: any
  links: Array<{
    title: string
    url: string
  }>
}
