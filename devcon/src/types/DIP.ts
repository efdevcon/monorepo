export enum Status {
  'Draft',
  'Accepted',
  'Postponed',
  'Not Implemented',
  'Changes Requested',
  'Active',
}

export enum Theme {
  'Ticketing',
  'Social',
  'Environmental Sustainability',
  'Virtual Experience',
  'Purchases & ID',
  'Community Involvement',
  'Art & Beauty',
  'Freeform',
  'Meta',
}

export enum Tag {
  'Event Operations',
  'Event Production',
  'Software',
  'Communications',
  'Sponsorships',
  'Community Hub',
  'Other',
}

export interface DIP {
  number: number
  title: string
  summary: string
  status: string // Hard to enumerate all statuses because of different casing
  github: string
  themes: Array<Theme>
  tags: Array<Tag>
  authors: Array<string>
  resources: string
  discussion: string
  created: number
  body?: string
  slug: string
  next_dip: string
  prev_dip: string
}

export interface Contributor {
  name: string
  url: string
  avatarUrl: string
}
