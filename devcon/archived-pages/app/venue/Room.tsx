import React from 'react'
import { AppTabsSection } from '../app-tabs-section'
import { SessionCard } from '../session'
import { AppSearch } from '../app-search'
import { useSort, SortVariation } from 'components/common/sort'
import { NoResults, useFilter } from 'components/common/filter'
import css from './room.module.scss'
import { Gallery } from 'components/common/gallery'
import CapacityIcon from 'assets/icons/capacity.svg'
import InfoIcon from 'assets/icons/info.svg'
import { Session as SessionType } from 'types/Session'
import { Room as RoomType } from 'types/Room'
import moment from 'moment'
import { AppNav } from 'components/domain/app/navigation'
import { Search, Tags, Basic, FilterFoldout } from 'components/common/filter/Filter'
import filterCss from 'components/domain/app/app-filter.module.scss'
import Image from 'next/legacy/image'
import Floor from 'assets/images/venue-map/venue-map-floor-1.jpeg'
import { usePanzoom, PanzoomControls } from './Venue'
import venueCss from './venue.module.scss'
import { useAppContext } from 'context/app-context'
import { useAccountContext } from 'context/account-context'

interface Props {
  room: RoomType
  sessions: Array<SessionType>
}

export const Room = (props: Props) => {
  const { now } = useAppContext()
  const { account } = useAccountContext()
  const sortedSessions = props.sessions.slice().sort((a, b) => {
    return moment.utc(a.start).isBefore(moment.utc(b.start)) ? -1 : 1
  })
  const pastSessions = sortedSessions.filter(i => !moment.utc(i.end).isAfter(now))
  const upcomingSessions = sortedSessions.filter(i => !moment.utc(i.start).isBefore(now))
  const bookmarkedSessions = account?.appState?.sessions
  const attendingSessions = sortedSessions.filter(i => bookmarkedSessions?.find(bookmark => bookmark.id === i.id))
  const [search, setSearch] = React.useState('')
  const pz = usePanzoom()

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: props.room.name,
            // to: '/app/schedule',
          },
        ]}
      />

      <div className={venueCss['panzoom']}>
        <div className={venueCss['image']} id="image-container">
          <Image src={Floor} alt="venue map" id="venue-image" priority />
        </div>
        <PanzoomControls pz={pz} />
      </div>

      <div className={`${filterCss['filter']} border-top`}>
        <div className="section clear-bottom-less">
          <Search placeholder="Search room sessions" onChange={setSearch} value={search} />
        </div>
      </div>

      <div className="section padding-top-less">
        {/* <AppSearch
            noResults={sessions.length === 0}
            search={{
              placeholder: 'Search room sessions...',
              onChange: setSearch,
            }}
            sortState={sortState}
            filterStates={[]}
            className={css['search-section']}
          /> */}

        <div className={css['background']}></div>

        {/* <Gallery className={css['gallery']}>
          <h1>{props.room.name}</h1>
          <h1>{props.room.name}</h1>
        </Gallery> */}

        <div className={css['room-info']}>
          <p className="h2 clear-bottom-less">{props.room.name}</p>
          {props.room.description && <p className="bold clear-bottom-less">{props.room.description}</p>}
          {props.room.capacity && (
            <div className="label">
              <CapacityIcon className={`icon ${css['capacity-icon']}`} />
              <p>Capacity - {props.room.capacity} </p>
              {/* <InfoIcon /> */}
            </div>
          )}
        </div>

        {/* {props.sessions
          .sort((a, b) => {
            return moment.utc(a.start).isBefore(moment.utc(b.start)) ? -1 : 1
          })
          .map(i => {
            return <SessionCard key={i.id} session={i} />
          })} */}

        <AppTabsSection
          className={css['tabs']}
          title="Sessions"
          tabs={[
            {
              title: 'Upcoming',
              content: (
                <div>
                  {upcomingSessions.map(i => {
                    return <SessionCard key={i.id} session={i} />
                  })}
                  {upcomingSessions.length === 0 && <NoResults />}
                </div>
              ),
            },
            {
              title: 'Attending',
              content: (
                <div>
                  {attendingSessions.map(i => {
                    return <SessionCard key={i.id} session={i} />
                  })}
                  {attendingSessions.length === 0 && <NoResults />}
                </div>
              ),
            },
            {
              title: 'Past',
              content: (
                <div>
                  {pastSessions.length > 0 &&
                    pastSessions.map(i => {
                      return <SessionCard key={i.id} session={i} />
                    })}
                  {pastSessions.length === 0 && <NoResults />}
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  )
}
