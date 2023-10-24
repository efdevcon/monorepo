import React from 'react'
import { Meetup } from 'src/types/Meetup'
import { GetDomainName } from 'src/utils/formatting'
import css from './events.module.scss'

interface MeetupOverviewProps {
  data: Array<Meetup>
}

export function MeetupOverview(props: MeetupOverviewProps) {
  return (
    <div className={css['events']}>
      {props.data.map((event: Meetup) => {
        return (
          <div key={event.id} className={css['event']}>
            <div>
              <a href={event.url} target="_blank" rel="oopener noreferrer">
                <p className={css['date']}>{event.location}</p>
                <p className={css['title']}>{event.title}</p>

                <span className={css['url']}>{GetDomainName(event.url)}</span>
              </a>
            </div>
            <div>
              <a href={event.url} target="_blank" rel="oopener noreferrer">
                <div className={css['image-column']}>
                  <img src={event.imageUrl} alt={event.title} />
                </div>
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
