import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Session as SessionType } from 'types/Session'
import moment from 'moment'
import { useAccountContext } from 'context/account-context'
import { useAppContext } from 'context/app-context'
import CalendarIcon from 'assets/icons/favorite.svg'
import cn from 'classnames'
import CoreProtocol from 'lib/assets/images/dc7-tracks/CoreProtocol.png'
import Cypherpunk from 'lib/assets/images/dc7-tracks/Cypherpunk.png'
import Usability from 'lib/assets/images/dc7-tracks/Usability.png'
import RealWorldEthereum from 'lib/assets/images/dc7-tracks/RealWorldEthereum.png'
import AppliedCryptography from 'lib/assets/images/dc7-tracks/AppliedCryptography.png'
import CryptoEconomics from 'lib/assets/images/dc7-tracks/CryptoEconomics.png'
import Coordination from 'lib/assets/images/dc7-tracks/Coordination.png'
import DeveloperExperience from 'lib/assets/images/dc7-tracks/DeveloperExperience.png'
import Security from 'lib/assets/images/dc7-tracks/Security.png'
import Layer2 from 'lib/assets/images/dc7-tracks/Layer2.png'
import IconSpeaker from 'assets/icons/speaker.svg'
import IconClock from 'assets/icons/icon_clock.svg'
import Image from 'next/image'
import css from './sessions.module.scss'
import { useRecoilState } from 'recoil'
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@/components/ui/popover'
import { StandalonePrompt } from 'lib/components/ai/standalone-prompt'
import { useDraggableLink } from 'lib/hooks/useDraggableLink'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import ShareIcon from 'assets/icons/arrow-curved.svg'
import {
  devaBotVisibleAtom,
  selectedSessionAtom,
  selectedSessionSelector,
  sessionFilterAtom,
  sessionFilterOpenAtom,
  attendingSessionsAtom,
  interestedSessionsAtom,
} from 'pages/_app'
import { usePathname } from 'next/navigation'
import FilterIcon from 'assets/icons/filter-tract.svg'
import HeartIcon from 'assets/icons/heart.svg'
import MagnifierIcon from 'assets/icons/magnifier.svg'
import { Separator } from 'lib/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'components/common/link'
import { SpeakerCard } from '../speakers'
import { CircleIcon } from 'lib/components/circle-icon'
import ScrollDownIcon from 'lib/assets/icons/scroll-down.svg'
import CityGuide from 'assets/images/dc-7/city-guide.png'
import { useRecoilValue } from 'recoil'
import { Popup } from 'lib/components/pop-up'
import LivestreamIcon from 'assets/icons/livestream.svg'
import IconStar from 'assets/icons/star.svg'
import IconStarFill from 'assets/icons/star-fill.svg'
import IconCalendarAdd from 'assets/icons/schedule-plus.svg'
import IconMarker from 'assets/icons/icon_marker.svg'
import IconPeople from 'assets/icons/icon_people.svg'
import IconAdded from 'assets/icons/calendar-added.svg'
import IconAdd from 'assets/icons/calendar-add.svg'
import IconCalendar from 'assets/icons/calendar.svg'
import PinIcon from 'assets/icons/pin.svg'
import AddToCalendar from 'components/domain/index/add-to-calendar/AddToCalendar'
import VideoIcon from 'assets/icons/video-play.svg'
import PenIcon from 'assets/icons/pen.svg'
import QuestionsIcon from 'assets/icons/questions.svg'
import { Button } from 'lib/components/button'

export const cardClass =
  'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative lg:bg-[#fbfbfb]'
export const tagClass = (active: boolean, className?: string) =>
  cn(
    'shrink-0 select-none cursor-pointer rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300',
    active ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : '',
    className
  )

export const matchSessionFilter = (session: SessionType, filter: string) => {
  return session.title.toLowerCase().includes(filter.toLowerCase())
}

const useSessionFilter = (sessions: SessionType[], event: any) => {
  const [sessionFilter, _] = useRecoilState(sessionFilterAtom)
  const [attendingSessions, setAttendingSessions] = useRecoilState(attendingSessionsAtom)
  const [interestedSessions, setInterestedSessions] = useRecoilState(interestedSessionsAtom)

  const { text, type, day, expertise, track, room, other } = sessionFilter

  const filterOptions = useMemo(() => {
    return {
      type: [...new Set(sessions.map(session => session.type))],
      day: ['All', 'Nov 12', 'Nov 13', 'Nov 14', 'Nov 15'],
      expertise: [...new Set(sessions.map(session => session.expertise))],
      track: [...new Set(sessions.map(session => session.track))],
      room: [...new Set(sessions.map(session => session.room))],
      other: ['Attending', 'Upcoming', 'Interested In', 'Past'],
    }
  }, [sessions])

  const filteredSessions = useMemo(() => {
    return sessions.filter((session: any) => {
      const matchesText =
        session.title.toLowerCase().includes(text.toLowerCase()) ||
        session.description.toLowerCase().includes(text.toLowerCase()) ||
        session.speakers?.some((speaker: any) => speaker.name.toLowerCase().includes(text.toLowerCase())) ||
        session.expertise.toLowerCase().includes(text.toLowerCase()) ||
        session.type.toLowerCase().includes(text.toLowerCase()) ||
        session.track.toLowerCase().includes(text.toLowerCase())

      const isAttending = attendingSessions[session.id]
      const isInterested = interestedSessions[session.id]

      const matchesType = Object.keys(type).length === 0 || sessionFilter.type[session.type]
      const matchesDay = Object.keys(day).length === 0 || moment(session.date).format('MMM D') === day
      const matchesExpertise = Object.keys(expertise).length === 0 || sessionFilter.expertise[session.expertise]
      const matchesTrack = Object.keys(track).length === 0 || sessionFilter.track[session.track]
      const matchesRoom = Object.keys(room).length === 0 || sessionFilter.room[session.room]

      const matchesAttending = sessionFilter.other['Attending'] && isAttending
      const matchesInterested = sessionFilter.other['Interested In'] && isInterested
      //   let matchesPast = sessionFilter.other['Past'] && now?.isAfter(moment(session.endTime))
      //   let matchesUpcoming = sessionFilter.other['Upcoming'] && now?.isBefore(moment(session.startTime))

      const matchesOther = matchesAttending || matchesInterested || Object.keys(other).length === 0

      return matchesText && matchesType && matchesDay && matchesExpertise && matchesTrack && matchesRoom && matchesOther
    })
  }, [sessions, sessionFilter, attendingSessions, interestedSessions])

  return {
    filteredSessions,
    filterOptions,
  }
}

const getExpertiseColor = (expertise: string) => {
  if (expertise === 'Beginner') return 'bg-[#7dffa050]'
  if (expertise === 'Intermediate') return 'bg-[#baacff50]'
  if (expertise === 'Expert') return 'bg-[#faa8a850]'

  return 'bg-[#765ae450]'
}

const getTrackColor = (track: string) => {
  switch (track) {
    case 'Core Protocol':
      return 'bg-[#F6F2FF]'
    case 'Cypherpunk & Privacy':
      return 'bg-[#FFF4FF]'
    case 'Usability':
      return 'bg-[#FFF4F4]'
    case 'Real World Ethereum':
      return 'bg-[#FFEDDF]'
    case 'Applied Cryptography':
      return 'bg-[#FFFEF4]'
    case 'Cryptoeconomics':
      return 'bg-[#F9FFDF]'
    case 'Coordination':
      return 'bg-[#E9FFD7]'
    case 'Developer Experience':
      return 'bg-[#E8FDFF]'
    case 'Security':
      return 'bg-[#E4EEFF]'
    case 'Layer 2':
      return 'bg-[#F0F1FF]'
    default:
      return 'bg-[white]' // Light Gray (default color)
  }
}

const getTrackLogo = (track: string) => {
  let trackLogo = CityGuide

  if (track === 'Core Protocol') {
    trackLogo = CoreProtocol
  }
  if (track === 'Cypherpunk & Privacy') {
    trackLogo = Cypherpunk
  }
  if (track === 'Usability') {
    trackLogo = Usability
  }
  if (track === 'Real World Ethereum') {
    trackLogo = RealWorldEthereum
  }
  if (track === 'Applied Cryptography') {
    trackLogo = AppliedCryptography
  }
  if (track === 'Cryptoeconomics') {
    trackLogo = CryptoEconomics
  }
  if (track === 'Coordination') {
    trackLogo = Coordination
  }
  if (track === 'Developer Experience') {
    trackLogo = DeveloperExperience
  }
  if (track === 'Security') {
    trackLogo = Security
  }
  if (track === 'Layer 2') {
    trackLogo = Layer2
  }

  return trackLogo
}

const ExpertiseTag = ({ expertise, className }: { expertise: string; className?: string }) => {
  return (
    <div
      className={cn(
        'text-[10px] text-black rounded-full px-2 py-0.5 font-semibold border border-solid border-[transparent]',
        getExpertiseColor(expertise),
        className,
        css['glass-tag']
      )}
    >
      {expertise}
    </div>
  )
}

const TrackTag = ({ track, className }: { track: string; className?: string }) => {
  return (
    <div
      className={cn(
        'text-[10px] text-black rounded-full px-2 py-0.5 font-semibold border border-solid border-[#E1E4EA]',
        getTrackColor(track),
        css['glass-tag'],
        className
      )}
    >
      {track}
    </div>
  )
}

export const SessionCard = ({ session, className }: { session: SessionType; className?: string }) => {
  const { id, title, speakers, track, date, startTime, endTime, expertise, description } = session
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const [selectedSession, setSelectedSession] = useRecoilState(selectedSessionAtom)
  const formatTime = (time: moment.Moment | undefined) => time?.format('HH:mm')
  const speakerNames = speakers ? speakers.map(speaker => speaker.name).join(', ') : ''
  const { account, setSessionBookmark } = useAccountContext()
  const { now } = useAppContext()
  const bookmarkedSessions = account?.sessions
  const bookmarkedSession = bookmarkedSessions?.find(bookmark => bookmark.id === id && bookmark.level === 'attending')
  const sessionIsBookmarked = !!bookmarkedSession
  const start = moment.utc(startTime)
  const end = moment.utc(endTime)
  const sessionHasPassed = now?.isAfter(end)
  const sessionIsUpcoming = now?.isBefore(start)
  const sessionIsLive = !sessionHasPassed && !sessionIsUpcoming
  const nowPlusSoonThreshold = now && now.clone().add(1, 'hours')
  const isSoon = moment.utc(start).isAfter(now) && moment.utc(start).isBefore(nowPlusSoonThreshold)
  const relativeTime = start?.from(now)
  //   const router = useRouter()
  const draggableLink = useDraggableLink()
  const pathname = usePathname()
  const [attendingSessions, setAttendingSessions] = useRecoilState(attendingSessionsAtom)
  const [interestedSessions, setInterestedSessions] = useRecoilState(interestedSessionsAtom)

  const trackLogo = getTrackLogo(track)

  return (
    <Link
      className={cn(
        'flex flex-col bg-white rounded-lg overflow-hidden hover:border-[#ac9fdf] border border-solid border-[#E1E4EA] transition-all duration-300',
        selectedSession?.id === id && pathname === '/schedule' ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
        className
      )}
      to={`/schedule/${id}`}
      {...draggableLink}
      onClick={(e: any) => {
        const result = draggableLink.onClick(e)

        if (!result) return

        if (pathname === '/schedule') e.preventDefault()

        if (selectedSession?.id === id && pathname === '/schedule') {
          setSelectedSession(null)
        } else {
          setSelectedSession(session)
        }

        setDevaBotVisible(false)
      }}
    >
      <div className="flex justify-between min-h-[100px] h-full">
        <div
          className={cn(
            'basis-[100px] shrink-0 flex rounded-tr-none rounded-br-none items-center justify-center relative overflow-hidden',
            getTrackColor(track)
          )}
        >
          <div
            className={cn(
              'absolute top-0 flex w-full self-start text-xs text-white font-semibold p-2 z-[1] line-clamp-3 break-words',
              css['session-gradient-1']
            )}
          >
            <div className="text-white z-[2]">{track}</div>
          </div>
          {trackLogo !== CityGuide && (
            <Image
              src={trackLogo}
              alt={track}
              height={150}
              width={150}
              className="w-full h-[90%] object-contain transform translate-x-1/4 -translate-y-1/6"
            />
          )}

          <div className="absolute bottom-1 w-full left-1 flex">
            <ExpertiseTag expertise={expertise || ''} />
          </div>
        </div>
        <div className="flex flex-col justify-between grow p-2 pl-3">
          <div>
            <p className="text-sm font-medium text-gray-800 line-clamp-2">{title}</p>
            {/* <p className="text-xs text-gray-600 mt-1 truncate">{track}</p> */}
          </div>
          <div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2 mb-1">{description}</p>
            {sessionIsLive && <div className="label rounded red bold mb-1 sm">Happening now!</div>}
            {isSoon && (
              <div className="label rounded text-gray-500 !border-gray-400 bold sm mb-1">Starts {relativeTime}</div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <IconClock className="icon flex shrink-0" />
              <p className="text-xs text-gray-600">
                {(() => {
                  const startTime = start
                  const endTime = end

                  return `${startTime.format('MMM Do')} — ${startTime.format('HH:mm A')} - ${endTime.format('HH:mm A')}`
                })()}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <IconSpeaker className="icon shrink-0" />
              <p className="text-xs text-gray-600 truncate">{speakerNames}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col shrink-0">
          <div
            className="shrink-0 flex self-start justify-center items-start p-3 pb-1.5  pl-1 cursor-pointer hover:scale-110 transition-all duration-300"
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()

              setAttendingSessions({ ...attendingSessions, [session.id]: !attendingSessions[session.id] })
            }}
          >
            {attendingSessions[session.id] ? (
              <IconAdded style={{ '--color-icon': '#7d52f4' }} />
            ) : (
              <CalendarIcon style={{ '--color-icon': '#99A0AE' }} />
            )}
          </div>
          <div
            className="shrink-0 flex self-start justify-center items-start p-3 pt-1.5 pl-1 cursor-pointer hover:scale-110 transition-all duration-300"
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()

              setInterestedSessions({ ...interestedSessions, [session.id]: !interestedSessions[session.id] })
            }}
          >
            {interestedSessions[session.id] ? (
              <HeartIcon style={{ '--color-icon': '#7d52f4' }} />
            ) : (
              <HeartIcon style={{ '--color-icon': '#99A0AE' }} />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export const SessionFilterAdvanced = ({ filterOptions }: { filterOptions: any }) => {
  const [sessionFilter, setSessionFilter] = useRecoilState(sessionFilterAtom)
  const [sessionFilterOpen, setSessionFilterOpen] = useRecoilState(sessionFilterOpenAtom)

  const toggleFilter = (category: string, value: string) => {
    const isSelected = sessionFilter[category][value]
    const nextFilter = { ...sessionFilter, [category]: { ...sessionFilter[category], [value]: !isSelected } }

    if (isSelected) {
      delete nextFilter[category][value]
    }

    setSessionFilter(nextFilter)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <div className="flex flex-col gap-3 pb-4 font-semibold">Session Type</div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.type.map((type: string) => (
            <div key={type} className={tagClass(sessionFilter.type[type])} onClick={() => toggleFilter('type', type)}>
              {type}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-col gap-3 pb-4 font-semibold">Tracks</div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.track.map((track: string) => (
            <div
              key={track}
              className={tagClass(sessionFilter.track[track])}
              onClick={() => toggleFilter('track', track)}
            >
              {track}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-col gap-3 pb-4 font-semibold">Expertise</div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.expertise.map((expertise: string) => (
            <div
              key={expertise}
              className={tagClass(sessionFilter.expertise[expertise])}
              onClick={() => toggleFilter('expertise', expertise)}
            >
              {expertise}
            </div>
          ))}
        </div>
      </div>

      {/* <div>
        <div className="flex flex-col gap-3 pb-4 lg:px-4 font-semibold">Rooms</div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.room.map((room: string) => (
            <div key={room} className={tagClass(sessionFilter.room[room])} onClick={() => toggleFilter('room', room)}>
              {room}
            </div>
          ))}
        </div>
      </div> */}

      <Button
        className="mt-2 flex self-center items-center gap-2 text-sm"
        fill
        color="black-1"
        onClick={() => {
          const advancedFilterKeys = ['type', 'track', 'expertise', 'room']
          setSessionFilter({
            ...sessionFilter,
            ...advancedFilterKeys.reduce((acc, key) => {
              acc[key] = {}
              return acc
            }, {} as any),
          })

          setSessionFilterOpen(false)
        }}
      >
        <FilterIcon className="icon" style={{ fontSize: '12px' }} />
        Reset Filter
      </Button>
    </div>
  )
}

export const SessionFilter = ({ filterOptions }: { filterOptions: any }) => {
  const draggableLink = useDraggableLink()
  const [sessionFilterOpen, setSessionFilterOpen] = useRecoilState(sessionFilterOpenAtom)
  const [sessionFilter, setSessionFilter] = useRecoilState(sessionFilterAtom)
  const [openPopover, setOpenPopover] = useState<string | null>(null)

  const updateOtherFilter = (other: string) => {
    const toggled = sessionFilter.other[other]

    const nextFilter = { ...sessionFilter, other: { ...sessionFilter.other, [other]: true } }

    if (!toggled) {
      setSessionFilter(nextFilter)
    } else {
      delete nextFilter.other[other]

      setSessionFilter(nextFilter)
    }
  }

  const advancedFilterKeys = ['type', 'track', 'expertise', 'room']
  const advancedFilterApplied = advancedFilterKeys.some(key => Object.keys(sessionFilter[key]).length > 0)

  return (
    <div data-type="session-filter" className="flex flex-col gap-3">
      <div className="flex flex-row gap-3 justify-between w-full lg:px-4 lg:pt-4 pb-2">
        <div data-type="session-filter-search" className="relative">
          <input
            type="text"
            value={sessionFilter.text}
            onChange={e => setSessionFilter({ ...sessionFilter, text: e.target.value })}
            placeholder="Find a session"
            className="w-full py-2 px-4 pl-10 bg-white rounded-full border text-sm border-solid border-[#E1E4EA] focus:outline-none"
          />

          <MagnifierIcon
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#99A0AE] icon"
            style={{ '--color-icon': '#99A0AE' }}
          />
        </div>

        <div data-type="session-filter-actions" className="flex flex-row gap-3 items-center text-xl">
          <div className="text-xs font-semibold line-clamp-1">
            {(() => {
              const computeFilterShorthand = (filter: { [key: string]: boolean }, key: string) => {
                const filterAsKeys = Object.keys(filter)

                if (filterAsKeys.length === 0) return
                if (filterAsKeys.length === 1) return filterAsKeys[0]

                return `${key} (${filterAsKeys.length})`
              }

              return (
                [
                  computeFilterShorthand(sessionFilter.track, 'Tracks'),
                  computeFilterShorthand(sessionFilter.type, 'Session Type'),
                  computeFilterShorthand(sessionFilter.expertise, 'Expertise'),
                  computeFilterShorthand(sessionFilter.room, 'Rooms'),
                ]
                  .filter(val => !!val)
                  .join(', ') || ''
              )
            })()}
          </div>

          <Popover
            open={openPopover === 'Advanced Filters'}
            onOpenChange={open => setOpenPopover(open ? 'Advanced Filters' : null)}
          >
            <PopoverTrigger className="flex justify-center items-center outline-none text-lg shrink-0">
              <FilterIcon
                onMouseEnter={() => setOpenPopover('Advanced Filters')}
                onMouseLeave={() => setOpenPopover(null)}
                onClick={() => setSessionFilterOpen(!sessionFilterOpen)}
                className="icon cursor-pointer hover:scale-110 transition-all duration-300"
                style={{
                  '--color-icon': sessionFilterOpen || advancedFilterApplied ? '#7d52f4' : 'black',
                  fontSize: '24px',
                }}
              />
            </PopoverTrigger>

            <PopoverContent className="w-auto p-1 text-sm px-2 pointer-events-none" side={'top'} sideOffset={10}>
              <div>Advanced Filters</div>
            </PopoverContent>
          </Popover>

          {/* <HeartIcon
            onClick={() => setSessionFilter({ ...sessionFilter, favorited: !sessionFilter.favorited })}
            className="icon cursor-pointer hover:scale-110 transition-all duration-300"
            style={{ '--color-icon': sessionFilter.favorited ? '#7d52f4' : '#99A0AE' }}
          /> */}
        </div>
      </div>

      <div className="lg:mx-4 border-bottom h-[1px]" />

      <div className="flex flex-row gap-3 items-center text-xs overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3 flex-nowrap p-1 lg:px-4">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center align-middle rounded-full border border-solid bg-white hover:bg-[#EFEBFF] border-transparent shadow px-4 py-1  cursor-pointer select-none transition-all duration-300',
                Object.keys(sessionFilter.other).length === 0 ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : ''
              )}
              {...draggableLink}
              onClick={e => {
                const result = draggableLink.onClick(e)

                if (!result) return

                setSessionFilter({ ...sessionFilter, other: {} })
              }}
            >
              All
            </div>
            <Separator orientation="vertical" className="h-6" />

            {filterOptions.other.map((other: string) => (
              <div
                key={other}
                className={cn(
                  'flex shrink-0 items-center justify-center align-middle rounded-full border bg-white hover:bg-[#EFEBFF] border-solid border-transparent shadow px-4 py-1 cursor-pointer select-none transition-all duration-300',
                  sessionFilter.other[other] ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : ''
                )}
                onClick={() => {
                  updateOtherFilter(other)
                }}
              >
                {other}
                {other === 'Attending' && (
                  <IconAdded className="icon ml-2" style={{ '--color-icon': '#7d52f4', fontSize: '14px' }} />
                )}
                {other === 'Interested In' && (
                  <HeartIcon className="icon ml-2" style={{ '--color-icon': '#7d52f4', fontSize: '14px' }} />
                )}
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <div className="lg:mx-4 mb-4 border-bottom h-[1px]" />
    </div>
  )
}

export const ScrollUpComponent = ({ visible }: { visible: boolean }) => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && isScrolled && (
        <motion.div
          className="right-0 left-0 flex justify-center items-center select-none sticky bottom-4 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CircleIcon
            className="bg-[#F0F2FF] w-[30px] h-[30px] pointer-events-auto"
            onClick={() => {
              const container =
                document.querySelector('[data-type="session-list"]') ||
                document.querySelector('[data-type="speaker-list"]')

              if (container) {
                container.scrollIntoView({ behavior: 'smooth' })
              }
            }}
          >
            <ScrollDownIcon style={{ fontSize: '18px', transform: 'rotateX(180deg)' }} />
          </CircleIcon>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// TODO: use recommendation engine to generate personalized suggestions
export const PersonalizedSuggestions = ({ sessions }: { sessions: SessionType[] }) => {
  // @ts-ignore
  const featuredSessions = sessions.filter(s => s.featured)

  return (
    <>
      <div className="flex flex-col gap-3 pb-4 lg:px-4 font-semibold">Schedule Highlights</div>

      <div className="overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3">
            {featuredSessions.map((session, index) => (
              <SessionCard
                session={session}
                key={session.id}
                className={cn('w-[360px] max-w-[360px] shrink-0', index === 0 ? 'lg:ml-4' : '')}
              />
            ))}
          </div>
        </SwipeToScroll>
      </div>
    </>
  )
}

const SESSIONS_PER_PAGE = 25

export const SessionList = ({
  event,
  filteredSessions,
  filterOptions,
}: {
  sessions: SessionType[]
  event: any
  filteredSessions: SessionType[]
  filterOptions: any
}) => {
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const [sessionFilter, setSessionFilter] = useRecoilState(sessionFilterAtom)
  const draggableLink = useDraggableLink()

  const [isSticky, setIsSticky] = useState(false)
  const stickyRef = useRef<HTMLDivElement>(null)
  const [visibleSessions, setVisibleSessions] = useState<SessionType[]>([])
  const [page, setPage] = useState(1)

  console.log(sessionFilter, 'session filter')

  useEffect(() => {
    const stickyElement = stickyRef.current
    if (!stickyElement) return

    const handleScroll = () => {
      const stickyTop = stickyElement.getBoundingClientRect().top
      setIsSticky(stickyTop <= 72) // 72px is the top position when sticky
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 20) {
        setPage(prevPage => prevPage + 1)
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filteredSessions])

  useEffect(() => {
    setVisibleSessions(filteredSessions.slice(0, page * SESSIONS_PER_PAGE))
  }, [page, filteredSessions])

  const groupedSessions = useMemo(() => {
    return visibleSessions.reduce((acc, session) => {
      const date = moment(session.date).format('MMM D')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(session)
      return acc
    }, {} as Record<string, SessionType[]>)
  }, [visibleSessions])

  const generateDayOptions = (startTime: string, endTime: string) => {
    const start = moment(startTime)
    const end = moment(endTime)
    const days = ['All']
    const today = moment().startOf('day')

    for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
      if (m.isSame(today, 'day')) {
        days.push('Today')
      } else {
        days.push(m.format('MMM D'))
      }
    }

    return days
  }

  console.log(event, 'event')

  //   const dayOptions = useMemo(() => generateDayOptions(event.startDate, event.endDate), [event])

  //   console.log(dayOptions, 'dayOptions')

  //   console.log(visibleSessions, 'visibleSessions')

  return (
    <div data-type="session-list" className={cn(cardClass)}>
      <SessionFilter filterOptions={filterOptions} />

      <PersonalizedSuggestions sessions={filteredSessions} />
      {/* 
      <div className="flex flex-col gap-3 pb-4 lg:px-4 font-semibold">Featured Sessions</div>

      <div className="overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3">
            {featuredSessions.map((session, index) => (
              <SessionCard
                session={session}
                key={session.id}
                className={cn('w-[360px] max-w-[360px] shrink-0', index === 0 ? 'lg:ml-4' : '')}
              />
            ))}
          </div>
        </SwipeToScroll>
      </div> */}

      <div data-type="session-prompts" className="flex gap-3 my-4 border-bottom lg:mx-4 pb-4">
        <StandalonePrompt className="w-full" onClick={() => setDevaBotVisible('Help me find sessions about')}>
          <div className="truncate">Help me find sessions about</div>
        </StandalonePrompt>
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible('Recommend sessions based on my interests')}
        >
          <div className="truncate">Recommend sessions based on my interests</div>
        </StandalonePrompt>
      </div>

      <div className="flex flex-col gap-3 lg:px-4 font-semibold">Sessions</div>

      <div
        className={cn('sticky top-[55px] lg:top-[56px] z-[10] overflow-hidden', isSticky ? css['sticky-glass'] : '')}
        ref={stickyRef}
      >
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row flex-nowrap gap-2 lg:p-3 py-3 w-full">
            {filterOptions.day.map((day: string, index: number, array: string[]) => (
              <div
                key={day}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300',
                  (Object.keys(sessionFilter.day).length === 0 && day === 'All') || sessionFilter.day[day]
                    ? 'border-[#ac9fdf] !bg-[#EFEBFF]'
                    : '',
                  index === array.length - 1 ? 'mr-4' : '',
                  day === 'Today' ? '!text-blue-800 font-semibold' : ''
                )}
                {...draggableLink}
                onClick={e => {
                  const result = draggableLink.onClick(e)

                  if (!result) return

                  const container = document.querySelector('[data-type="session-list"]')

                  if (container) {
                    container.scrollIntoView({ behavior: 'smooth' })
                  }

                  setTimeout(() => {
                    if (day === 'All') {
                      setSessionFilter({ ...sessionFilter, day: {} })
                    } else {
                      const active = sessionFilter.day[day]

                      const nextFilter = { ...sessionFilter.day }

                      if (active) {
                        delete nextFilter[day]
                        setSessionFilter({ ...sessionFilter, day: nextFilter })
                      } else {
                        nextFilter[day] = true
                        setSessionFilter({ ...sessionFilter, day: nextFilter })
                      }
                    }
                  }, 100)
                }}
              >
                {day}
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <motion.div className="flex flex-col gap-3 mb-4 lg:px-4 relative">
        {Object.entries(groupedSessions).map(([date, dateSessions]) => (
          <React.Fragment key={date}>
            <motion.div className="font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {date}
            </motion.div>
            {dateSessions.map(session => (
              <motion.div key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SessionCard session={session} />
              </motion.div>
            ))}
          </React.Fragment>
        ))}

        <ScrollUpComponent visible={visibleSessions.length > 20} />
      </motion.div>
    </div>
  )
}

export const Livestream = ({ session, className }: { session: SessionType; className?: string }) => {
  return (
    <div className={cn('flex flex-col shrink-0 gap-3', className)}>
      <div className={cn('flex justify-between items-center')}>
        <div className="flex flex-col gap-3 font-semibold">Livestream</div>
        <div className="text-xs text-red bg-[#FFC0C5] px-2 py-0.5 rounded-full flex items-center gap-1">
          <LivestreamIcon className="icon shrink-0" style={{ '--color-icon': 'red' }} />
          <div className="text-red font-semibold">Live</div>
        </div>
      </div>

      <div className="aspect">
        <div className="w-full h-full bg-[#784DEF1A] rounded-2xl relative flex items-center justify-center border border-solid border-[#E1E4EA]">
          <VideoIcon
            className="icon hover:scale-110 transition-transform duration-300 cursor-pointer"
            style={{ '--color-icon': '#7D52F4', fontSize: '40px' }}
          />
        </div>
      </div>

      <div
        className="flex justify-evenly shrink-0 text-xs border border-solid border-[#E1E4EA] rounded-2xl p-1 gap-2 my-1 font-semibold bg-white"
        // @ts-ignore
        style={{ '--color-icon': '#7D52F4' }}
      >
        <div className="flex flex-col items-center justify-center cursor-pointer">
          <div className="text-lg hover:scale-110 transition-transform duration-300 mb-1">
            <PenIcon />
          </div>
          <p>Take Collaborative Notes</p>
          <p className="text-[10px] text-[#717784]">Powered by Fileverse</p>
        </div>
        <div className="flex flex-col items-center justify-center cursor-pointer">
          <div className="text-lg hover:scale-110 transition-transform duration-300 mb-1">
            <QuestionsIcon />
          </div>
          <p>Ask Speaker Questions</p>
          <p className="text-[10px] text-[#717784]">Powered by Meerkat</p>
        </div>
      </div>

      <div className="flex justify-center">
        <Link to="https://devcon.org/dips" className="text-xs text-[#7D52F4] text-underline" indicateExternal>
          Learn more about Devcon Improvement Proposals
        </Link>
      </div>
    </div>
  )
}

export const SessionView = ({ session, standalone }: { session: SessionType | null; standalone?: boolean }) => {
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const [attendingSessions, setAttendingSessions] = useRecoilState(attendingSessionsAtom)
  const [interestedSessions, setInterestedSessions] = useRecoilState(interestedSessionsAtom)
  const [selectedSession, setSelectedSession] = useRecoilState(selectedSessionAtom)
  //   const { toast } = useToast()

  if (!session) return null

  const trackLogo = getTrackLogo(session.track)

  //   const copyShareLink = () => {
  //     const shareUrl = `${window.location.origin}/sessions/${session.id}`
  //     navigator.clipboard
  //       .writeText(shareUrl)
  //       .then(() => {
  //         toast({
  //           title: 'Session link copied to clipboard!',
  //           duration: 3000,
  //         })
  //       })
  //       .catch(err => {
  //         console.error('Failed to copy: ', err)
  //         toast({
  //           title: 'Failed to copy link',
  //           description: 'Please try again',
  //           duration: 3000,
  //         })
  //       })
  //   }

  return (
    <div
      data-type="session-view"
      className={cn(
        cardClass,
        'flex flex-col gap-3 lg:p-4 self-start w-full no-scrollbar',
        !standalone && 'lg:max-h-[calc(100vh-84px)] lg:overflow-auto'
      )}
    >
      <div
        className={cn(
          'relative rounded-2xl w-full h-full flex items-end overflow-hidden border border-solid border-[#cdbaff] lg:border-[#E1E4EA] shrink-0',
          getTrackColor(session.track)
        )}
      >
        <Image
          // @ts-ignore
          src={trackLogo}
          alt={session.track}
          //   width={393}
          //   height={393}
          className="rounded-2xl w-[120%] h-[120%] aspect-video scale-[120%] object-contain object-right "
        />
        <div className="absolute inset-0 flex items-start gap-2 p-2">
          <TrackTag track={session.track} className="self-start" />
          <ExpertiseTag expertise={session.expertise || ''} className="self-start" />
        </div>

        <div
          className={cn(
            'absolute rounded-2xl flex justify-between items-end p-3 pb-1 pt-7 self-end left-0 right-0',
            css['session-gradient-2']
          )}
        >
          <div className="font-medium z-10 flex flex-col gap-2 translate-y-[3px] pb-1 text-white max-w-[70%]">
            {/* <TrackTag track={session.track} className="self-start" /> */}
            <p className="text-lg">{session.title}</p>
          </div>
          <div className="text-2xl lg:text-lg z-10 flex flex-row self-end">
            <div
              className="shrink-0 flex self-start justify-center items-start p-2  cursor-pointer hover:scale-110 transition-all duration-300 select-none"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()

                setAttendingSessions({ ...attendingSessions, [session.id]: !attendingSessions[session.id] })
              }}
            >
              {attendingSessions[session.id] ? (
                <IconAdded style={{ '--color-icon': 'white' }} />
              ) : (
                <CalendarIcon style={{ '--color-icon': 'white' }} />
              )}
            </div>

            <div
              className="shrink-0 flex self-start justify-center items-start p-2  cursor-pointer hover:scale-110 transition-all duration-300 select-none"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()

                setInterestedSessions({ ...interestedSessions, [session.id]: !interestedSessions[session.id] })
              }}
            >
              {interestedSessions[session.id] ? (
                <HeartIcon style={{ '--color-icon': 'red' }} />
              ) : (
                <HeartIcon style={{ '--color-icon': 'white' }} />
              )}
            </div>

            {!standalone && (
              <Link
                className="flex justify-center items-center select-none shrink-0 p-2"
                to={`/schedule/${session.id}`}
              >
                <ShareIcon
                  className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
                  style={{ '--color-icon': 'white' }}
                  //   onClick={copyShareLink}
                />
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <div className="flex flex-col font-semibold">Description</div>
        <div className="text-sm text-[#535353] shrink-0">{session.description}</div>
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <IconClock className="icon flex shrink-0" style={{ '--color-icon': 'black' }} />
          <span className="text-sm text-[black]">
            {moment(session.date).format('MMM Do')} — {moment(session.startTime).format('HH:mm A')} -{' '}
            {moment(session.endTime).format('HH:mm A')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <IconSpeaker className="icon shrink-0" style={{ '--color-icon': 'black' }} />
          <span className="text-sm text-[black]">{session.type}</span>
        </div>
        {/* <div className="flex items-center gap-2">
          <IconSpeaker className="icon shrink-0" style={{ '--color-icon': 'black' }} />
          <span className="text-sm text-[black]">{session.speakers?.map(speaker => speaker.name).join(', ')}</span>
        </div> */}
      </div>

      <div className="flex justify-evenly shrink-0 text-xs border border-solid border-[#E1E4EA] rounded-2xl p-1 gap-2 my-1 font-semibold bg-white">
        <div
          className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
          onClick={() => setAttendingSessions({ ...attendingSessions, [session.id]: !attendingSessions[session.id] })}
        >
          <div className="text-lg hover:scale-110 transition-transform duration-300">
            {attendingSessions[session.id] ? <IconAdded style={{ '--color-icon': '#7d52f4' }} /> : <CalendarIcon />}
          </div>
          <p>Attend Session</p>
        </div>
        <div
          className="flex flex-col items-center justify-center gap-1 cursor-pointer group select-none"
          onClick={() =>
            setInterestedSessions({ ...interestedSessions, [session.id]: !interestedSessions[session.id] })
          }
        >
          <div className="text-lg group-hover:scale-110 transition-transform duration-300">
            {interestedSessions[session.id] ? <HeartIcon style={{ '--color-icon': '#7d52f4' }} /> : <HeartIcon />}
          </div>
          <p>Mark as interesting</p>
        </div>

        {/* <AddToCalendar
          event={{
            id: session.id,
            title: `${session.title}${session.room ? ` / Room: ${session.room.name}` : ''}`,
            description: session.description,
            location: 'Queen Sirikit National Convention Center',
            startDate: moment.utc(session.start),
            endDate: moment.utc(session.end),
          }}
        >
          <div className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="text-lg hover:scale-110 transition-transform duration-300">
              <IconCalendar />
            </div>
            <p>Export to Calendar</p>
          </div>
        </AddToCalendar> */}

        {/* <Link to={standalone ? `/venue?room=${session.room?.id}` : `/venue/${session.room?.id}`}>
          <p>Room Details</p> <PinIcon />
        </Link> */}
      </div>

      <div className="border-bottom pb-4 shrink-0">
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible(`Tell me about similar sessions to "${session.title}"`)}
        >
          <div className="truncate">Tell me about similar sessions</div>
        </StandalonePrompt>
      </div>

      <div className="flex flex-col gap-3 font-semibold shrink-0">Speakers</div>

      <div className="flex flex-col gap-3 shrink-0">
        {session.speakers?.map(speaker => (
          <SpeakerCard speaker={speaker} key={speaker.id} />
        ))}
      </div>

      <Livestream session={session} className="border-top pt-2 shrink-0 lg:hidden" />
    </div>
  )
}

export const SessionLayout = ({ sessions, event }: { sessions: SessionType[] | null; event: any }) => {
  const [_, setSelectedSession] = useRecoilState(selectedSessionAtom)
  const selectedSession = useRecoilValue(selectedSessionSelector)
  const [sessionFilterOpen, setSessionFilterOpen] = useRecoilState(sessionFilterOpenAtom)
  const { filteredSessions, filterOptions } = useSessionFilter(sessions || [], event)

  useEffect(() => {
    if (sessionFilterOpen) {
      setSelectedSession(null)
    }
  }, [sessionFilterOpen])

  useEffect(() => {
    if (selectedSession) {
      setSessionFilterOpen(false)
    }
  }, [selectedSession])

  if (!sessions || sessions.length === 0) return null

  return (
    <div
      data-type="speaker-layout"
      className={cn('flex flex-row lg:gap-3 relative')}
      // initial={{ opacity: 0 }}
      // animate={{ opacity: 1 }}
      // transition={{ duration: 1 }}
    >
      <div className={cn('basis-[60%] grow')}>
        <SessionList
          sessions={sessions}
          event={event}
          filteredSessions={filteredSessions}
          filterOptions={filterOptions}
        />
      </div>

      {/* {selectedSession && (
        <div
          className={cn(
            'basis-[100%] lg:basis-[40%] lg:min-w-[393px] max-w-[100%] lg:sticky lg:top-[72px] lg:self-start no-scrollbar'
          )}
        >
          <SessionView session={selectedSession} />
        </div>
      )} */}

      {/* <div className="block lg:hidden">
        <Popup open={!!selectedSession} setOpen={() => setSelectedSession(null)}>
          <div
            className={cn(
              'basis-[100%] lg:basis-[40%] lg:min-w-[393px] max-w-[100%] lg:sticky lg:top-[72px] lg:self-start'
            )}
          >
            <SessionView session={selectedSession} />
          </div>
        </Popup>
      </div> */}

      {sessionFilterOpen && (
        <div
          className={cn(
            'basis-[40%] min-w-[393px] max-w-[100%] sticky top-[72px] self-start hidden lg:block',
            cardClass
          )}
        >
          <SessionFilterAdvanced filterOptions={filterOptions} />
        </div>
      )}

      <div className={cn('block lg:hidden')}>
        <Popup open={sessionFilterOpen} setOpen={() => setSessionFilterOpen(false)}>
          <SessionFilterAdvanced filterOptions={filterOptions} />
        </Popup>
      </div>

      {selectedSession && !sessionFilterOpen && (
        <div className={cn('basis-[40%] min-w-[393px] max-w-[100%] sticky top-[72px] self-start hidden lg:block')}>
          <SessionView session={selectedSession} />
        </div>
      )}
    </div>
  )
}
