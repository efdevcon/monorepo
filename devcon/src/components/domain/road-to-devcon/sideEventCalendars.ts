// Community-curated side event calendars for Devcon week, shown as link-out
// cards on /road-to-devcon. Names are proper nouns and stay untranslated; the
// description and feature labels come from `road_to_devcon.side_events.*`.
//
// No event counts on purpose: these lists grow daily and a hardcoded number
// would be stale within days.

export type CalendarPlatform = 'luma' | 'sheet' | 'website'

// What a visitor can do with the calendar — one shared vocabulary so the cards
// are comparable at a glance.
export type CalendarFeature = 'subscribe' | 'submit' | 'filters' | 'rsvp' | 'prices' | 'discounts' | 'venues'

export interface SideEventCalendar {
  id: string
  name: string
  url: string
  platform: CalendarPlatform
  features: CalendarFeature[]
}

export const SIDE_EVENT_CALENDARS: SideEventCalendar[] = [
  {
    id: 'mira',
    name: 'Mira',
    url: 'https://miragather.com/Devcon8SideEvents2026',
    platform: 'website',
    features: ['filters', 'rsvp', 'submit'],
  },
  {
    id: 'krew3',
    name: 'Krew3',
    url: 'https://krew3.site/events',
    platform: 'website',
    features: ['filters', 'venues'],
  },
  {
    id: 'luma',
    name: 'Devcon 8 Side Events',
    url: 'https://luma.com/Devcon8',
    platform: 'luma',
    features: ['subscribe', 'rsvp', 'submit'],
  },
  {
    id: 'build3',
    name: 'Build3 DAO',
    url: 'https://docs.google.com/spreadsheets/d/1MDHdcFf69FEk_Zm48mJmYjzgrePxxpptMyY7MlzMBgg/edit?gid=0#gid=0',
    platform: 'sheet',
    features: ['rsvp', 'discounts'],
  },
  {
    id: 'ibw',
    name: 'India Blockchain Week',
    url: 'https://docs.google.com/spreadsheets/d/1NZ09OVlqElsM64oUm-8i1yh_A-U0p39BJECthwHCsLA/edit?gid=0#gid=0',
    platform: 'sheet',
    features: ['submit'],
  },
  {
    id: 'mandala',
    name: 'Mandala Network',
    url: 'https://docs.google.com/spreadsheets/d/1BNpqu0CHpaSuntTdHAE-3VejQnv7nzKtmgnsZDuQJZs/edit?gid=616164035#gid=616164035',
    platform: 'sheet',
    features: ['prices', 'submit'],
  },
]
