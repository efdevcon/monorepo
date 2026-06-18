// Road to Devcon community events shown on /road-to-devcon.
//
// There is no CMS/API source for these yet, so this is a typed static list.
// When a real data source lands, swap `ROAD_TO_DEVCON_EVENTS` for the fetch and
// keep the `RoadEvent` shape — the listing UI only depends on this type.

export const EVENT_TYPES = [
  'Conference',
  'Meetup',
  'Presentation',
  'Educational',
  'Virtual',
  'Open Source',
  'Privacy',
  'Security',
  'AI',
  'Policy',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export interface RoadEvent {
  id: string
  title: string
  host: string
  /** Location tag shown on the card image (e.g. "Mumbai", "Virtual"). */
  city: string
  /** ISO date (YYYY-MM-DD) the event starts. */
  date: string
  types: EventType[]
  url?: string
  /** Event image/logo (proxied NocoDB attachment URL). Falls back to `gradient`. */
  image?: string
  /** Tailwind gradient classes used as the card's placeholder artwork. */
  gradient: string
}

// Placeholder artwork gradients (mirrors the design's colourful card images).
const G = {
  teal: 'from-[#4bfcde] to-[#a9befd]',
  violet: 'from-[#c8a9fd] to-[#8b5cf6]',
  sunset: 'from-[#f7a8d8] to-[#fde08a]',
  ocean: 'from-[#67e8f9] to-[#6366f1]',
  lime: 'from-[#bef264] to-[#34d399]',
  coral: 'from-[#fda4af] to-[#fb923c]',
  indigo: 'from-[#a5b4fc] to-[#7c3aed]',
  rose: 'from-[#fecdd3] to-[#e879f9]',
}

/** Ordered palette so NocoDB-backed events (no image) get stable placeholder art. */
export const GRADIENTS = Object.values(G)

/** Deterministic gradient for a given key, so a card's colour is stable across loads. */
export function gradientFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}

export const ROAD_TO_DEVCON_EVENTS: RoadEvent[] = [
  {
    id: 'ethnoders-node-operators-mumbai',
    title: 'Ethereum Node Operators Meetup',
    host: 'EthNoders India',
    city: 'Mumbai',
    date: '2026-05-28',
    types: ['Meetup', 'Open Source'],
    gradient: G.indigo,
  },
  {
    id: 'solidity-study-bengaluru-29',
    title: 'Solidity Study Group: Bengaluru',
    host: 'Solidity Devs India',
    city: 'Bengaluru',
    date: '2026-05-29',
    types: ['Educational', 'Presentation'],
    gradient: G.teal,
  },
  {
    id: 'solidity-study-delhi-30',
    title: 'Solidity Study Group: Delhi',
    host: 'Solidity Devs India',
    city: 'Delhi',
    date: '2026-05-30',
    types: ['Educational', 'Presentation'],
    gradient: G.violet,
  },
  {
    id: 'solidity-study-virtual-30',
    title: 'Solidity Study Group: Online',
    host: 'Solidity Devs India',
    city: 'Virtual',
    date: '2026-05-30',
    types: ['Educational', 'Virtual'],
    gradient: G.sunset,
  },
  {
    id: 'privacy-builders-bengaluru',
    title: 'Privacy Builders Roundtable',
    host: 'Privacy Stewards India',
    city: 'Bengaluru',
    date: '2026-06-06',
    types: ['Privacy', 'Meetup'],
    gradient: G.ocean,
  },
  {
    id: 'security-workshop-hyderabad',
    title: 'Smart Contract Security Workshop',
    host: 'Secureum India',
    city: 'Hyderabad',
    date: '2026-06-14',
    types: ['Security', 'Educational'],
    gradient: G.lime,
  },
  {
    id: 'ai-x-ethereum-online',
    title: 'AI x Ethereum: Agents Onchain',
    host: 'Autonolas Community',
    city: 'Virtual',
    date: '2026-06-21',
    types: ['AI', 'Virtual', 'Presentation'],
    gradient: G.rose,
  },
  {
    id: 'eth-policy-roundtable-delhi',
    title: 'Ethereum Policy Roundtable',
    host: 'India Crypto Coalition',
    city: 'Delhi',
    date: '2026-07-04',
    types: ['Policy', 'Conference'],
    gradient: G.coral,
  },
  {
    id: 'open-source-day-pune',
    title: 'Open Source Contributor Day',
    host: 'FOSS United',
    city: 'Pune',
    date: '2026-07-12',
    types: ['Open Source', 'Meetup'],
    gradient: G.indigo,
  },
  {
    id: 'devcon-india-conference-mumbai',
    title: 'Road to Devcon Conference',
    host: 'Devcon India',
    city: 'Mumbai',
    date: '2026-07-26',
    types: ['Conference', 'Presentation'],
    gradient: G.teal,
  },
]
