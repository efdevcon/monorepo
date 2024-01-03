import React from 'react'
import css from './dashboard.module.scss'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'
import { NotificationCard } from '../notifications'
import { SessionCard } from '../session'
import { Session as SessionType } from 'types/Session'
import { SliderStickyNotes } from 'components/common/slider/SliderVariations'
import { DropdownVariationDots } from 'components/common/dropdown/Dropdown'
import HighlightChivas from 'assets/images/highlight-chivas-sound.png'
import HighlightHackerBasement from 'assets/images/highlight-hacker-basement.png'
import HighlightCommunityHubs from 'assets/images/highlight-hub.png'
import { Card } from 'components/common/card'
import { Slider, useSlider } from 'components/common/slider'
import { usePageContext } from 'context/page-context'
import { useAppContext } from 'context/app-context'
import { useAccountContext } from 'context/account-context'
import moment from 'moment'

const galleryEvents = [
  {
    title: 'Continuous Devcon - Hacker Basement',
    description:
      'Be sure to visit the Cyber Basement to experience the truly immersive co-working space. Kept open late into the night to accomodate your needs.',
    url: 'https://devcon.org/continuous-devcon/#hacker-basement',
    image: HighlightHackerBasement,
  },
  {
    title: 'Community Hubs',
    description:
      'Want to engage and learn about the core communities that make Ethereum and Devcon the truly special place that it is? Be sure to find the community hubs on Floor 1.',
    // TODO: Update URL
    url: 'https://devcon.org/continuous-devcon/#hacker-basement',
    image: HighlightCommunityHubs,
  },
  {
    title: 'CHIVAS Sound Stage',
    description:
      'Brought an instrument, or just musically inclined? come jam with the community at the traditional CHIVAS sound stage.',
    // TODO: Update URL
    url: 'https://devcon.org/continuous-devcon/#hacker-basement',
    image: HighlightChivas,
  },
  {
    title: 'Side Events',
    description: 'Check out Side Events happening in Bogotá!',
    // TODO: Update URL
    url: '/app/side-events',
    image: HighlightChivas,
  },
]

export const Dashboard = (props: any) => {
  const [openNotifications, setOpenNotifications] = React.useState(true)
  const [openUpcomingSessions, setOpenUpcomingSessions] = React.useState(true)
  const [openSuggestedSessions, setOpenSuggestedSessions] = React.useState(true)
  const { account } = useAccountContext()
  const pageContext = usePageContext()
  const { now } = useAppContext()

  const sliderSettings = {
    infinite: false,
    touchThreshold: 100,
    speed: 500,
    slidesToShow: 3,
    arrows: false,
    // slidesToScroll: 3,
    swipeToSlide: true,
    mobileFirst: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2.1,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1.1,
        },
      },
    ],
  }

  const sliderProps = useSlider(sliderSettings)

  const upcomingSessions = (() => {
    const bookmarkedSessions = account?.appState?.sessions
    const sessions: SessionType[] = props.sessions
    const nowPlusThreshold = now && now.clone().add(24, 'hours')

    if (!now) return null

    return sessions
      .sort((a, b) => {
        return moment.utc(a.start).isBefore(moment.utc(b.start)) ? -1 : 1
      })
      .map(session => {
        const attending = bookmarkedSessions?.some(bookmarkedSession => bookmarkedSession.id === session.id)

        if (!attending) return null

        const isUpcoming =
          moment.utc(session.start).isAfter(now) && moment.utc(session.start).isBefore(nowPlusThreshold)

        if (!isUpcoming) return null

        return <SessionCard key={session.id} session={session} />
      })
      .filter(session => !!session)
      .slice(0, 3)
  })()

  const suggestedSessions = ['7LHLPB', '9CNZCW']
    .map(sessionId => {
      const session = props.sessions.find((session: SessionType) => session.id === sessionId)

      if (!session) return null

      const sessionHasPassed = moment.utc(session.end).isBefore(now)

      if (sessionHasPassed) return null

      return <SessionCard key={sessionId} session={session} />
    })
    .filter(session => !!session)

  return (
    <>
      {/* <AppNav /> */}
      <div className="section no-overflow">
        <div className={css['quicklinks']}>
          <div className={css['title-container']}>
            <p className="app-header bold">Quicklinks</p>

            <div className={css['dropdown']}>
              <DropdownVariationDots
                value="Another thing2"
                onChange={() => {}}
                options={[
                  {
                    text: 'Schedule',
                    value: 'schedule',
                    url: '/app/schedule',
                    // onClick: (close: any) => close(),
                  },
                  {
                    text: 'Guides',
                    value: 'guides',
                    url: '/app/info',
                    // onClick: (close: any) => close(),
                  },
                  {
                    text: 'Venue Map',
                    value: 'venue map',
                    url: '/app/venue',
                    // onClick: (close: any) => close(),
                  },
                  {
                    text: 'Speakers',
                    value: 'speakers',
                    url: '/app/speakers',
                    // onClick: (close: any) => close(),
                  },
                  {
                    text: 'Side Events',
                    value: 'side-events',
                    url: '/app/side-events',
                    // onClick: (close: any) => close(),
                  },
                ]}
              />
            </div>
          </div>

          <SliderStickyNotes
            cards={[
              {
                title: 'Schedule',
                description: 'View & manage your devcon schedule.',
                url: '/app/schedule',
                color: 'pink',
              },
              {
                title: 'Guides',
                description: 'Access Devcon Bogota local guides.',
                url: '/app/info',
                color: 'yellow',
              },
              {
                title: 'Venue Map',
                description: 'Find your way around the Conference.',
                url: '/app/venue',
                color: 'green',
              },
              {
                title: 'Speakers',
                description: 'View speakers presenting at Devcon.',
                url: '/app/speakers',
                color: 'blue',
              },
              {
                title: 'Side Events',
                description: 'Check out Side Events happening in Bogotá!',
                url: '/app/side-events',
                color: 'grey',
              },
            ]}
          />
        </div>

        <div className={`${css['hero']}`}>
          <p className="app-header bold">Dashboard</p>
          <div className={css['cards']}>
            <Slider sliderProps={sliderProps} onlySlider>
              {galleryEvents.map((event, i: number) => {
                let className = css['card']

                if (i === galleryEvents.length - 1) className += ` ${css['last']}`

                return (
                  <Card
                    className={className}
                    slide={sliderProps[1].canSlide}
                    key={event.title}
                    title={event.title}
                    description={event.description}
                    imageUrl={event.image}
                    expandLink
                    linkUrl={event.url} // Linking to blog domain temporarily until blog page is done (static-phase)
                    // metadata={[moment(blog.date).format('ll'), blog.author]}
                    allowDrag
                  />
                )
              })}
            </Slider>
          </div>
        </div>

        {pageContext?.appNotifications[0] && (
          <CollapsedSection
            className={css['latest-notification']}
            open={openNotifications}
            setOpen={() => setOpenNotifications(!openNotifications)}
          >
            <CollapsedSectionHeader>
              <p className="app-header">Latest Notification</p>
            </CollapsedSectionHeader>
            <CollapsedSectionContent>
              <NotificationCard notification={pageContext?.appNotifications[0]} />
            </CollapsedSectionContent>
          </CollapsedSection>
        )}

        {upcomingSessions && upcomingSessions.length > 0 && (
          <CollapsedSection open={openUpcomingSessions} setOpen={() => setOpenUpcomingSessions(!openUpcomingSessions)}>
            <CollapsedSectionHeader>
              <p className="app-header">Your Next Sessions</p>
            </CollapsedSectionHeader>
            <CollapsedSectionContent>{upcomingSessions}</CollapsedSectionContent>
          </CollapsedSection>
        )}

        {suggestedSessions.length > 0 && (
          <CollapsedSection
            open={openSuggestedSessions}
            setOpen={() => setOpenSuggestedSessions(!openSuggestedSessions)}
          >
            <CollapsedSectionHeader>
              <p className="app-header">Suggested Sessions</p>
            </CollapsedSectionHeader>
            <CollapsedSectionContent>{suggestedSessions}</CollapsedSectionContent>
          </CollapsedSection>
        )}

        {/* <CollapsedSection>
          <CollapsedSectionHeader title="Side Events" />
          <CollapsedSectionContent>
            <SessionCard session={props.sessions[0]} />
          </CollapsedSectionContent>
        </CollapsedSection> */}
      </div>
    </>
  )
}
