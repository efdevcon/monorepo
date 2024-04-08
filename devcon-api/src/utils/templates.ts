import { GetData } from 'clients/filesystem'
import dayjs from 'dayjs'

export function GetEventDay(eventId: string, date: Date) {
  const events = GetData('events')
  const event = events.find((i) => i.id === eventId)

  if (!event) return ''
  const startDate = dayjs(event.startDate)
  const diff = dayjs(date).diff(startDate, 'day')

  return `Day ${diff + 1}`
}

export function GetRandomStyle() {
  const styles = [
    'cryptoeconomics',
    'developer-infrastructure',
    'governance',
    'layer-1',
    'layer-2',
    'global-impact',
    'security',
    'staking',
    'ux-design',
    'zkps',
  ]

  return styles[Math.floor(Math.random() * styles.length)]
}

export function GetTrackId(track: string) {
  if (track === 'Cryptoeconomics') return 'cryptoeconomics'
  if (track === 'Developer Infrastructure') return 'developer-infrastructure'
  if (track === 'Governance & Coordination') return 'governance'
  if (track === 'Layer 1 Protocol') return 'layer-1'
  if (track === 'Layer 2s') return 'layer-2'
  if (track === 'Opportunity & Global Impact') return 'global-impact'
  if (track === 'Security') return 'security'
  if (track === 'Staking & Validator Experience') return 'staking'
  if (track === 'UX & Design') return 'ux-design'
  if (track === 'ZKPs: Privacy, Identity, Infrastructure, & More') return 'zkps'

  if (track === 'Music') return 'cryptoeconomics'
  return ''
}

export function GetTrackImage(baseUri: string, track: string) {
  if (track === 'Cryptoeconomics') return `${baseUri}/static/images/tracks/Cryptoeconomics.svg`
  if (track === 'Developer Infrastructure') return `${baseUri}/static/images/tracks/Developer Infrastructure.svg`
  if (track === 'Governance & Coordination') return `${baseUri}/static/images/tracks/Governance & Coordination.svg`
  if (track === 'Layer 1 Protocol') return `${baseUri}/static/images/tracks/Layer 1 Protocol.svg`
  if (track === 'Layer 2s') return `${baseUri}/static/images/tracks/Layer 2s.svg`
  if (track === 'Opportunity & Global Impact') return `${baseUri}/static/images/tracks/Opportunity & Global Impact.svg`
  if (track === 'Security') return `${baseUri}/static/images/tracks/Security.svg`
  if (track === 'Staking & Validator Experience') return `${baseUri}/static/images/tracks/Staking & Validator Experience.svg`
  if (track === 'UX & Design') return `${baseUri}/static/images/tracks/UX & Design.svg`
  if (track === 'ZKPs: Privacy, Identity, Infrastructure, & More') return `${baseUri}/static/images/tracks/ZKPs and Privacy.svg`

  if (track === 'Music') return `${baseUri}/static/images/tracks/Activities.png`
  return null
}
