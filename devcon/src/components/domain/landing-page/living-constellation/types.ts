import type { StaticImageData } from 'next/image'

export interface ConstellationEvent {
  logo: StaticImageData
  label: string
}

export interface ConstellationSpeaker {
  id: string
  name: string
  title: string
  company: string
  color: string
  image: StaticImageData
  type?: 'speaker' | 'logo'
  event?: ConstellationEvent
  companyLogo?: StaticImageData
}
