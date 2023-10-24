import { Event } from 'src/types/Event'
import { Meetup } from 'src/types/Meetup'

export function ToEventData(data: any): Array<Event> {
  return data.events ? data.events.nodes.map((i: any) => ToEvent(i)) : []
}

export function ToEvent(node: any): Event {
  return {
    id: node.fields.id,
    title: node.frontmatter.title,
    startDate: node.frontmatter.startDate,
    endDate: node.frontmatter.endDate,
    imageUrl: node.frontmatter.imageUrl,
    url: node.frontmatter.url,
  } as Event
}

export function ToMeetupData(data: any): Array<Meetup> {
  const meetups = data.meetups ? data.meetups.nodes.map((i: any) => ToMeetup(i)) : []
  const globalMeetup = meetups.find((i: Meetup) => i.location === 'Global, Worldwide')
  const otherMeetups = meetups.filter((i: Meetup) => i.location !== 'Global, Worldwide')

  return [{ ...globalMeetup }, ...otherMeetups]
}

export function ToMeetup(node: any): Meetup {
  return {
    id: node.fields.id,
    title: node.frontmatter.title,
    location: node.frontmatter.location,
    imageUrl: node.frontmatter.imageUrl,
    url: node.frontmatter.url,
  } as Meetup
}
