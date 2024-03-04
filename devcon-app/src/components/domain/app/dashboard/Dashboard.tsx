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
import HighlightDeva from 'assets/images/highlight-deva.png'
import HighlightManual from 'assets/images/manual-highlight.png'
import HighlightCoworking from 'assets/images/highlight-coworking.png'
import HighlightDevaAwards from 'assets/images/highlight-deva-awards.png'
import HighlightNFT from 'assets/images/nft.gif'
import { Card } from 'components/common/card'
import { Slider, useSlider } from 'components/common/slider'
import { usePageContext } from 'context/page-context'
import { useAppContext } from 'context/app-context'
import { useAccountContext } from 'context/account-context'
import moment from 'moment'

const galleryEvents = [
  {
    title: 'Agora Coworking Sat 15/Sun 16 9-6PM',
    description:
      'Devcon might be over, but doesn’t mean you can’t make the most out of your time in Bogota. Be sure to make use of the co-working space all weekend at Agora after Devcon.',
    // url: '/info#coworking',
    image: HighlightCoworking,
  },
  {
    title: 'Devcon Souvenir NFT',
    description:
      'Mint your official Devcon souvenir on Arbitrum, Polygon, & Optimism Today! Mainnet minting goes live on Friday!',
    url: 'https://devcon-vi.attest.tickets/nfts',
    image: HighlightNFT,
  },
  {
    title: 'Go Carbon Neutral at Devcon 🌳🌲  [POAP inside] 🦄 🏅',
    description:
      'Help make Devcon VI climate neutral and get a beautiful Deva POAP with the Climate Friendly Devcon VI Dapp. The Dapp enables you to compensate your air travel and event carbon emissions entirely on-chain.',
    url: 'https://devcon.discarbon.earth/index.html',
    image: HighlightDeva,
  },
  {
    title: 'Deva Awards',
    description:
      'Come join the closing ceremonies and celebration of community and light hearted look back at achievement in the ecoystem when it comes to adoption and progress.',
    url: 'https://app.devcon.org/schedule/R9QRVK',
    image: HighlightDevaAwards,
  },
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
    url: 'info#community-hubs',
    image: HighlightCommunityHubs,
  },
  {
    title: 'CHIVAS Sound Stage',
    description:
      'Brought an instrument, or just musically inclined? come jam with the community at the traditional CHIVAS sound stage.',
    url: 'https://devcon.org/continuous-devcon',
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

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const sliderSettings = {
    infinite: true,
    touchThreshold: 100,
    speed: 500,
    slidesToShow: 3,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 8000,
    // slidesToScroll: 3,
    swipeToSlide: true,
    mobileFirst: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
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
        const attending = bookmarkedSessions?.some(
          bookmarkedSession => bookmarkedSession.id === session.id && bookmarkedSession.level === 'attending'
        )

        if (!attending) return null

        const isUpcoming = moment.utc(now).isBefore(session.end) // && moment.utc(session.start).isBefore(nowPlusThreshold)

        if (!isUpcoming) return null

        return <SessionCard key={session.id} session={session} />
      })
      .filter(session => !!session)
      .slice(0, 3)
  })()

  const suggestedSessions = ['HFPLPD', 'RJQZFR', '7LHLPB', '9CNZCW', 'ZC9D8N', 'B3UQM7', 'ETJQDZ', 'LHM9LA', 'ZPHEXR']
    .map(sessionId => {
      const session = props.sessions.find((session: SessionType) => session.id === sessionId)

      if (!session) return null

      const sessionHasPassed = moment.utc(session.end).isBefore(now)

      if (sessionHasPassed) return null

      return session
    })
    .filter(session => !!session)
    .sort((a, b) => {
      return moment.utc(a.start).isBefore(moment.utc(b.start)) ? -1 : 1
    })
    .slice(0, 5)
    .map(i => <SessionCard key={i.id} session={i} />)

  return (
    <>
      {/* <AppNav /> */}
      <div className="section no-overflow">
        <div className={css['quicklinks']}>
          <div className={css['title-container']}>
            <p className="app-header bold">Quicklinks</p>

            <div className={css['dropdown']}>
              <DropdownVariationDots
                value="Quicklinks"
                onChange={() => {}}
                options={[
                  {
                    text: 'Schedule',
                    value: 'schedule',
                    url: '/schedule',
                  },
                  {
                    text: 'Devcon Manual',
                    value: 'manual',
                    url: 'https://blog.ethereum.org/2022/10/04/devcon-manual',
                  },
                  {
                    text: 'Bogota City Guide',
                    value: 'guides',
                    url: '/info',
                  },
                  {
                    text: 'Side Events',
                    value: 'venue map',
                    url: '/side-events',
                  },
                  {
                    text: 'Devcon Week',
                    value: 'speakers',
                    url: 'https://devcon.org/devcon-week',
                  },
                ]}
              />
            </div>
          </div>

          <SliderStickyNotes
            cards={[
              {
                title: 'Schedule',
                description: 'View and manage your schedule.',
                url: '/schedule',
                color: 'red',
              },
              {
                title: 'Devcon Manual',
                description: 'Learn all things related to the Devcon Experience!',
                url: 'https://blog.ethereum.org/2022/10/04/devcon-manual',
                color: 'pink',
              },
              {
                title: 'Bogota City Guide',
                description: 'Access Devcon Bogota local guides.',
                url: '/info',
                color: 'yellow',
              },
              {
                title: 'Side Events',
                description: 'Access all the other community events happening around Devcon.',
                url: '/side-events',
                color: 'green',
              },
              {
                title: 'Devcon Week',
                description: 'Learn more about what is happening during Devcon Week.',
                url: 'https://devcon.org/devcon-week',
                color: 'blue',
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

        {mounted && pageContext?.appNotifications && pageContext.appNotifications[0] && (
          <CollapsedSection
            className={css['latest-notification']}
            open={openNotifications}
            setOpen={() => setOpenNotifications(!openNotifications)}
          >
            <CollapsedSectionHeader styleOpened>
              <p className="app-header">Latest Notification</p>
            </CollapsedSectionHeader>
            <CollapsedSectionContent>
              <div className={css['notification-spacing']}>
                <NotificationCard notification={pageContext?.appNotifications[0]} />
              </div>
            </CollapsedSectionContent>
          </CollapsedSection>
        )}

        {mounted && upcomingSessions && upcomingSessions.length > 0 && (
          <CollapsedSection open={openUpcomingSessions} setOpen={() => setOpenUpcomingSessions(!openUpcomingSessions)}>
            <CollapsedSectionHeader styleOpened>
              <p className="app-header">Your Next Sessions</p>
            </CollapsedSectionHeader>
            <CollapsedSectionContent>
              <div className="clear-top-less">{upcomingSessions}</div>
            </CollapsedSectionContent>
          </CollapsedSection>
        )}

        {mounted && suggestedSessions.length > 0 && (
          <CollapsedSection
            open={openSuggestedSessions}
            setOpen={() => setOpenSuggestedSessions(!openSuggestedSessions)}
          >
            <CollapsedSectionHeader styleOpened>
              <p className="app-header">Suggested Sessions</p>
            </CollapsedSectionHeader>
            <CollapsedSectionContent>
              <div className="clear-top-less">{suggestedSessions}</div>
            </CollapsedSectionContent>
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
