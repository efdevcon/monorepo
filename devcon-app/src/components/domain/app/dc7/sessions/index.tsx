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
import IconVenue from 'assets/icons/dc-7/location.svg'
import IconSpeaker from 'assets/icons/dc-7/speaker.svg'
import IconClock from 'assets/icons/icon_clock.svg'
import Image from 'next/image'
import css from './sessions.module.scss'
import { useRecoilState } from 'recoil'
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@/components/ui/popover'
import { StandalonePrompt } from 'lib/components/ai/standalone-prompt'
import { useDraggableLink } from 'lib/hooks/useDraggableLink'
import NoResults from 'assets/images/state/no-results.png'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import ShareIcon from 'assets/icons/arrow-curved.svg'
import { Modal, ModalContent } from 'lib/components/modal'
import { useWindowWidth } from '../../Layout'
import TimelineIcon from 'assets/icons/dc-7/timeline.svg'
import ListIcon from 'assets/icons/dc-7/listview.svg'
import CalendarExport from 'lib/assets/images/modal-export.png'
import Entertainment from 'assets/images/dc-7/entertainment.png'
import { generateCalendarExport } from 'lib/components/add-to-calendar'
import CollapsedIcon from 'assets/icons/collapsed.svg'
import ExpandedIcon from 'assets/icons/expanded.svg'
import {
  devaBotVisibleAtom,
  initialFilterState,
  selectedSessionAtom,
  selectedSessionSelector,
  sessionFilterAtom,
  sessionFilterOpenAtom,
  sessionTimelineViewAtom,
} from 'pages/_app'
import { usePathname, useSearchParams } from 'next/navigation'
import FilterIcon from 'assets/icons/filter-tract.svg'
import StarIcon from 'assets/icons/dc-7/star.svg'
import StarFillIcon from 'assets/icons/dc-7/star-fill.svg'
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
import { PersonalizedSuggestions } from './recommendations'
import Timeline from './timeline'
import { usePersonalized } from 'pages/schedule/u/[id]'

export const tagClassTwo = (active?: boolean, className?: string) =>
  cn(
    'shrink-0 select-none cursor-pointer mr-2 rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[black] hover:border-[black] font-semibold hover:text-black transition-all duration-300',
    active ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
    className
  )
export const cardClass =
  'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative lg:bg-[#fbfbfb]'
export const tagClass = (active: boolean, className?: string) =>
  cn(
    'shrink-0 select-none cursor-pointer rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300',
    active ? ' border-[#ac9fdf] bg-[#EFEBFF]' : '',
    className
  )

export const matchSessionFilter = (session: SessionType, filter: string) => {
  return session.title.toLowerCase().includes(filter.toLowerCase())
}

const useSessionFilter = (sessions: SessionType[], event: any) => {
  const { account } = useAccountContext()
  const [sessionFilter, setSessionFilter] = useRecoilState(sessionFilterAtom)
  const [timelineView, setTimelineView] = useRecoilState(sessionTimelineViewAtom)
  const { now } = useAppContext()

  const { text, type, day, expertise, track, room, other } = sessionFilter

  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    const newFilter = { ...initialFilterState } as any //...sessionFilter }

    searchParams.forEach((value, key) => {
      if (key in newFilter) {
        if (key === 'text') {
          // Handle text filter
          newFilter.text = decodeURIComponent(value)
        } else if (typeof newFilter[key] === 'object') {
          // Handle object filters (type, track, expertise, etc)
          const values = value.split(',').map(v => decodeURIComponent(v))
          newFilter[key] = values.reduce((acc: any, val: string) => {
            acc[val] = true
            return acc
          }, {})
        } else if (value === '1') {
          // Handle boolean values
          newFilter[key] = true
        }
      }
    })

    setSessionFilter(newFilter)
  }, [])

  const filterOptions = useMemo(() => {
    return {
      type: [...new Set(sessions.map(session => session.type))].filter(Boolean),
      // day: timelineView ? ['Nov 12', 'Nov 13', 'Nov 14', 'Nov 15'] : ['All', 'Nov 12', 'Nov 13', 'Nov 14', 'Nov 15'],
      day: ['All', 'Nov 12', 'Nov 13', 'Nov 14', 'Nov 15'],
      expertise: [
        ...new Set(
          ['Beginner', 'Intermediate', 'Expert']
            .concat(...sessions.map((session: any) => session.expertise))
            .filter(Boolean)
        ),
      ],
      track: [...new Set(sessions.map(session => session.track)), 'CLS']
        .filter(Boolean)
        .filter(track => !track.startsWith('[CLS]')),
      room: [...new Set(sessions.map(session => session.slot_room?.name))].filter(Boolean).sort((a: any, b: any) => {
        if (a === 'Main Stage') return -1
        if (b === 'Main Stage') return 1

        if (a.toLowerCase().startsWith('stage')) {
          if (b.toLowerCase().startsWith('stage')) {
            return a.localeCompare(b)
          }
          return -1
        }

        if (b.toLowerCase().startsWith('stage')) return 1

        return a.localeCompare(b)
      }),
      other: ['Attending', 'Interested In', 'Upcoming', 'Past'],
    }
  }, [sessions, timelineView])

  const filteredSessions = useMemo(() => {
    return sessions.filter((session: any) => {
      const matchesText =
        session.title.toLowerCase().includes(text.toLowerCase()) ||
        session.description.toLowerCase().includes(text.toLowerCase()) ||
        session.speakers?.some((speaker: any) => speaker.name.toLowerCase().includes(text.toLowerCase())) ||
        session.expertise.toLowerCase().includes(text.toLowerCase()) ||
        session.type.toLowerCase().includes(text.toLowerCase()) ||
        session.track.toLowerCase().includes(text.toLowerCase())

      const isAttending = account?.attending_sessions?.includes(session.sourceId)
      const isInterested = account?.interested_sessions?.includes(session.sourceId)

      const matchesType = Object.keys(type).length === 0 || sessionFilter.type[session.type]
      const matchesDay =
        Object.keys(day).length === 0 ||
        sessionFilter.day[moment.utc(session.slot_start).add(7, 'hours').format('MMM D')]
      const matchesExpertise = Object.keys(expertise).length === 0 || sessionFilter.expertise[session.expertise]
      const matchesCLS = session.track.startsWith('[CLS]') && sessionFilter.track['CLS']
      const matchesTrack = Object.keys(track).length === 0 || sessionFilter.track[session.track] || matchesCLS
      const matchesRoom = Object.keys(room).length === 0 || sessionFilter.room[session.slot_room?.name]

      const matchesAttending = sessionFilter.other['Attending'] && isAttending
      const matchesInterested = sessionFilter.other['Interested In'] && isInterested
      const matchesPast = sessionFilter.other['Past'] && now?.isAfter(moment.utc(session.slot_end).add(7, 'hours'))
      const matchesUpcoming =
        sessionFilter.other['Upcoming'] && now?.isBefore(moment.utc(session.slot_start).add(7, 'hours'))

      const matchesOther =
        matchesAttending || matchesInterested || matchesUpcoming || matchesPast || Object.keys(other).length === 0

      return matchesText && matchesType && matchesDay && matchesExpertise && matchesTrack && matchesRoom && matchesOther
    })
  }, [sessions, sessionFilter])

  return {
    filteredSessions,
    filterOptions,
  }
}

export const getExpertiseColor = (expertise: string) => {
  if (expertise === 'Beginner') return 'bg-[#7dffa050]'
  if (expertise === 'Intermediate') return 'bg-[#baacff50]'
  if (expertise === 'Expert') return 'bg-[#faa8a850]'

  return 'bg-[#765ae450]'
}

export const getTrackColor = (track: string) => {
  if (track.startsWith('[CLS]')) return '!bg-[#fff2ca]'

  switch (track) {
    case 'Core Protocol':
      return '!bg-[#F6F2FF]'
    case 'Cypherpunk & Privacy':
      return '!bg-[#FFF4FF]'
    case 'Usability':
      return '!bg-[#FFF4F4]'
    case 'Real World Ethereum':
      return '!bg-[#FFEDDF]'
    case 'Applied Cryptography':
      return '!bg-[#f9ffef]'
    case 'Cryptoeconomics':
      return '!bg-[#F9FFDF]'
    case 'Coordination':
      return '!bg-[#E9FFD7]'
    case 'Developer Experience':
      return '!bg-[#E8FDFF]'
    case 'Security':
      return '!bg-[#E4EEFF]'
    case 'Layer 2':
      return '!bg-[#F0F1FF]'
    case 'Experience':
      return '!bg-[#FFFBF4]'
    default:
      return '!bg-[#dcffea]' // Light Gray (default color)
  }
}

export const getTrackLogo = (track: string) => {
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
  if (track === 'Experiences' || track === 'Entertainment') {
    trackLogo = Entertainment
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

const TrackTag = ({ track, className, applyColor = true, ...rest }: any) => {
  if (!track) return null

  return (
    <div
      className={cn(
        'text-[10px] rounded-full px-2 py-0.5 font-semibold border border-solid border-[#E1E4EA] flex gap-2 items-center',
        applyColor ? `${getTrackColor(track)} text-black` : '',
        className
      )}
      {...rest}
    >
      <Image src={getTrackLogo(track)} alt={track} height={15} width={15} />
      {track}
    </div>
  )
}

export const SessionCardPercentual = ({ session, className }: { session: SessionType; className?: string }) => {
  const start = moment.utc(session.slot_start).add(7, 'hours')
  const end = moment.utc(session.slot_end).add(7, 'hours')
  const trackLogo = getTrackLogo(session.track)

  return (
    <div
      className={cn(
        'flex flex-col bg-white rounded-[1em] overflow-hidden border border-solid border-[#E1E4EA] transition-all duration-300',
        className
      )}
      // style={{ fontSize: '16px' }} // Base font size to calculate ems from
    >
      <div className="flex justify-between" style={{ minHeight: '6.25em' }}>
        <div
          className={cn(
            'basis-[6.25em] shrink-0 flex rounded-tr-none rounded-br-none items-center justify-center relative overflow-hidden',
            getTrackColor(session.track)
          )}
        >
          <div className="absolute top-0 flex w-full self-start font-semibold p-[0.125em] z-[1] line-clamp-3 break-words ">
            <div className="text-white z-[2] line-clamp-4 !text-[0.8em]">{session.track}</div>
          </div>

          {trackLogo !== CityGuide && (
            <Image
              src={trackLogo}
              alt={session.track}
              height={150}
              width={150}
              className="w-full h-[90%] object-contain transform translate-x-1/4 -translate-y-1/6"
            />
          )}

          <div className="absolute bottom-[0.0625em] w-full left-[0.0625em] flex">
            <div
              className={cn(
                'text-black rounded-full px-[0.625em] py-[0.3125em] font-semibold border border-width-[0.1vw] border-solid border-[transparent]',
                getExpertiseColor(session.expertise || 'All Welcome'),
                className,
                css['glass-tag'],
                '!text-[0.5em]' // Changed from text-[10px] to text-[0.625em]
              )}
            >
              {session.expertise || 'All Welcome'}
            </div>
            {/* <ExpertiseTag expertise={session.expertise || 'All Welcome'} /> */}
          </div>
        </div>

        <div className="flex flex-col justify-between grow p-[0.5em]">
          <div style={{ marginBottom: '0.125em' }}>
            <p className="font-medium text-gray-800 line-clamp-2 text-1">{session.title}</p>
          </div>

          <div>
            <div className="flex items-center gap-[0.5em] text-1-25">
              <IconClock className="icon flex shrink-0" style={{ fontSize: '0.8em' }} />
              <p className="shrink-0 text-gray-600">
                {start.format('MMM Do')} — {start.format('h:mm A')} - {end.format('h:mm A')}
              </p>
            </div>

            {/* <div className="flex items-center gap-[0.125em]" style={{ fontSize: '0.75em' }}>
              <IconVenue className="icon shrink-0" style={{ fontSize: '1em' }} />
              <p className="shrink-0 text-gray-600">
                {session.type} - {session.slot_room?.name ?? session.slot_roomId}
              </p>
            </div> */}

            {session.speakers && session.speakers.length > 0 && (
              <div className="flex items-center gap-[0.5em] text-1-25">
                <IconSpeaker className="icon shrink-0" style={{ fontSize: '0.8em' }} />
                <p className="text-gray-600 line-clamp-1">{session.speakers.map(speaker => speaker.name).join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const SessionCard = ({
  session,
  className,
  tiny,
}: {
  session: SessionType
  className?: string
  tiny?: boolean
  scalePercentages?: boolean
}) => {
  console.log(session, 'session')
  const { account, setSessionBookmark } = useAccountContext()
  const { id, sourceId, title, speakers, track, slot_start, slot_end, expertise, description } = session
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const [selectedSession, setSelectedSession] = useRecoilState(selectedSessionAtom)
  //   const formatTime = (time: moment.Moment | undefined) => time?.format('HH:mm')
  const speakerNames = speakers ? speakers.map(speaker => speaker.name).join(', ') : ''
  const { now } = useAppContext()
  const bookmarkedSessions = account?.sessions
  const bookmarkedSession = bookmarkedSessions?.find(bookmark => bookmark.id === id && bookmark.level === 'attending')
  const sessionIsBookmarked = !!bookmarkedSession
  const start = moment.utc(slot_start).add(7, 'hours')
  const end = moment.utc(slot_end).add(7, 'hours')
  const sessionHasPassed = now?.isAfter(end)
  const sessionIsUpcoming = now?.isBefore(start)
  const sessionIsLive = !sessionHasPassed && !sessionIsUpcoming
  const nowPlusSoonThreshold = now && now.clone().add(1, 'hours')
  const isSoon = start.isAfter(now) && start.isBefore(nowPlusSoonThreshold)
  const relativeTime = start?.from(now)
  //   const router = useRouter()
  const draggableLink = useDraggableLink()
  const pathname = usePathname()
  const windowWidth = useWindowWidth()
  const isLargeScreen = windowWidth > 1024
  const trackLogo = getTrackLogo(track)
  const { isPersonalizedSchedule } = usePersonalized()

  if (tiny) {
    return (
      <Link
        className={cn(
          'flex flex-col rounded-lg relative hover:border-[#ac9fdf] border border-solid border-[#E1E4EA] transition-all duration-300 group hover:z-[2] min-h-[35px] mt-[2px] hover:h-auto group',
          getTrackColor(session.track),
          selectedSession?.sourceId === sourceId && pathname === '/schedule' ? 'border-[#ac9fdf]' : '',
          className
        )}
        to={`/schedule/${sourceId}`}
        {...draggableLink}
        onClick={(e: any) => {
          const result = draggableLink.onClick(e)

          if (!result) return

          if (pathname === '/schedule' && isLargeScreen) e.preventDefault()
          if (isPersonalizedSchedule && isLargeScreen) e.preventDefault()

          if (isLargeScreen) {
            if (selectedSession?.sourceId === sourceId && pathname === '/schedule') {
              setSelectedSession(null)
            } else {
              setSelectedSession(session)
            }
          }

          setDevaBotVisible(false)
        }}
      >
        <div className="flex flex-row items-center grow px-1 py-0.5 h-[100%] gap-2 sticky left-0 lg:left-[100px]">
          {trackLogo !== CityGuide && (
            <Image
              src={trackLogo}
              alt={track}
              height={15}
              width={15}
              className="w-[15px] h-[15px] shrink-0 grow-0 object-contain"
            />
          )}

          <p
            className={cn(
              'text-xs font-medium text-gray-800 line-clamp-2 group-hover:line-clamp-none sticky left-[8px] lg:left-[8px] leading-[12px]',
              getTrackColor(track)
            )}
          >
            {title}
          </p>
        </div>
      </Link>
    )
  }

  const isKeynote = title.startsWith('Keynote:')

  return (
    <Link
      className={cn(
        'flex flex-col rounded-lg overflow-hidden hover:border-[#ac9fdf] border border-solid border-[#E1E4EA] transition-all duration-300 relative',
        selectedSession?.sourceId === sourceId && pathname === '/schedule' ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
        className,
        isKeynote && 'bg-[#F0F2FF]',
        !isKeynote && 'bg-white'
      )}
      to={`/schedule/${sourceId}`}
      {...draggableLink}
      onClick={(e: any) => {
        const result = draggableLink.onClick(e)

        if (!result) return

        if (pathname === '/schedule' && isLargeScreen) e.preventDefault()
        if (isPersonalizedSchedule && isLargeScreen) e.preventDefault()

        if (isLargeScreen) {
          if (selectedSession?.sourceId === sourceId && pathname === '/schedule') {
            setSelectedSession(null)
          } else {
            setSelectedSession(session)
          }
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
            <div className="text-white z-[2] line-clamp-4">{track}</div>
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

          {trackLogo === CityGuide && (
            <Image src={trackLogo} alt={track} height={150} width={150} className="w-full h-full object-cover" />
          )}

          <div className="absolute bottom-1 w-full left-1 flex">
            <ExpertiseTag expertise={expertise || 'All Welcome'} />
          </div>
        </div>
        <div className="flex flex-col justify-between grow p-2 pl-3">
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-800 line-clamp-2">{title}</p>
            {/* <p className="text-xs text-gray-600 mt-1 truncate">{track}</p> */}
            {/* <p className="text-xs text-gray-600 mt-1 line-clamp-2 mb-1">{description}</p> */}
          </div>
          <div>
            {sessionIsLive && <div className="label rounded red bold mb-1 sm shrink-0">Happening now!</div>}
            {isSoon && (
              <div className="label rounded text-gray-500 !border-gray-400 bold sm mb-1">Starts {relativeTime}</div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <IconClock className="icon flex shrink-0" />
              <p className="text-xs shrink-0 text-gray-600">
                {(() => {
                  const startTime = start
                  const endTime = end

                  return `${startTime.format('MMM Do')} — ${startTime.format('h:mm A')} - ${endTime.format('h:mm A')}`
                })()}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <IconVenue className="icon flex shrink-0" />
              <p className="text-xs shrink-0 text-gray-600">
                {session.type} - {session.slot_room?.name ?? session.slot_roomId}
              </p>
            </div>

            {/* <div className='flex justify-between gap-1'> */}
            {speakerNames && speakerNames.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 w-full">
                <IconSpeaker className="icon shrink-0" />
                <p className="text-xs text-gray-600 line-clamp-1">{speakerNames}</p>
              </div>
            )}

            {/* </div> */}
          </div>
        </div>

        <div className="flex flex-col shrink-0 items-center">
          <div
            className="shrink-0 flex self-start justify-center items-center  cursor-pointer hover:scale-110 transition-all duration-300 h-[24px] w-[36px] mt-2"
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()

              setSessionBookmark(
                session,
                'attending',
                account,
                account?.attending_sessions?.includes(session.sourceId) ?? false
              )
            }}
          >
            {account?.attending_sessions?.includes(session.sourceId) ? (
              <IconAdded style={{ '--color-icon': '#7d52f4' }} />
            ) : (
              <CalendarIcon style={{ '--color-icon': '#99A0AE' }} />
            )}
          </div>
          <div
            className="shrink-0 flex self-start justify-center items-center cursor-pointer hover:scale-110 transition-all duration-300 h-[32px] w-[36px]"
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()

              setSessionBookmark(
                session,
                'interested',
                account,
                account?.interested_sessions?.includes(session.sourceId) ?? false
              )
            }}
          >
            {account?.interested_sessions?.includes(session.sourceId) ? (
              <StarFillIcon style={{ '--color-icon': '#7d52f4', fontSize: '18px' }} />
            ) : (
              <StarIcon style={{ '--color-icon': '#99A0AE', fontSize: '18px' }} />
            )}
          </div>
        </div>
      </div>

      {isKeynote && (
        <div className="absolute right-2 bottom-2 label !border-[#713ff6] !bg-white !text-[#713ff6] rounded !p-0.5 !text-[8px] !px-1 bold">
          Keynote
        </div>
      )}
    </Link>
  )
}

const filterTagClass = (selected: boolean) => {
  return cn(
    'flex shrink-0 text-xs items-center justify-center align-middle rounded-full border bg-white hover:bg-[#f8f7ff] border-solid border-transparent shadow px-4 py-1 cursor-pointer select-none transition-all duration-300',
    selected && '!bg-[#EFEBFF] !fill-[#7D52F4] border border-solid border-[#cdbaff]'
  )
}

const OpenAndClose = () => {
  return <div className="flex gap-2"></div>
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

  console.log(filterOptions, 'filterOptions')

  return (
    <div className="flex flex-col gap-4 p-4 pb-0">
      <div>
        <div className="flex justify-between gap-3 pb-4 font-semibold">
          <div>Type</div>
          <div
            onClick={() => {
              setSessionFilter({
                ...sessionFilter,
                type: {},
              })
            }}
            className={tagClassTwo(false, ' !text-[black] font-semibold')}
          >
            Reset
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.type.map((type: string) => (
            <div
              key={type}
              className={cn(filterTagClass(sessionFilter.type[type]), '!shrink')}
              onClick={() => toggleFilter('type', type)}
            >
              {type}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between gap-3 pb-4 font-semibold">
          <div>Tracks</div>
          <div
            onClick={() => {
              setSessionFilter({
                ...sessionFilter,
                track: {},
              })
            }}
            className={tagClassTwo(false, ' font-semibold')}
          >
            Reset
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.track.map((track: string) => (
            <TrackTag
              key={track}
              track={track}
              applyColor={sessionFilter.track[track] || false}
              //   className="!shrink"
              //   className={tagClass(sessionFilter.track[track]) + ' !shrink'}
              className={cn(tagClass(sessionFilter.track[track]), '!shrink')}
              onClick={() => toggleFilter('track', track)}
            >
              {track}
            </TrackTag>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between gap-3 pb-4 font-semibold">
          Expertise
          <div
            onClick={() => {
              setSessionFilter({
                ...sessionFilter,
                expertise: {},
              })
            }}
            className={tagClassTwo(false, ' !text-[black] font-semibold')}
          >
            Reset
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.expertise.map((expertise: string) => (
            <div
              key={expertise}
              //   className={tagClass(sessionFilter.expertise[expertise]) + ' !text-black font-semibold !shrink'}
              className={cn(filterTagClass(sessionFilter.expertise[expertise]), '!shrink')}
              onClick={() => toggleFilter('expertise', expertise)}
            >
              {expertise}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between gap-3 pb-4 font-semibold">
          Rooms
          <div
            onClick={() => {
              setSessionFilter({
                ...sessionFilter,
                room: {},
              })
            }}
            className={tagClassTwo(false, ' !text-[black] font-semibold')}
          >
            Reset
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.room.map((room: string) => (
            <div
              key={room}
              //   className={tagClass(sessionFilter.room[room]) + ' !text-black font-semibold !shrink'}
              className={cn(filterTagClass(sessionFilter.room[room]), '!shrink')}
              onClick={() => toggleFilter('room', room)}
            >
              {room}
            </div>
          ))}
        </div>
      </div>

      {/* <Separator className="my-1" /> */}

      <div className="sticky bottom-0 left-0 right-0 shrink-0 flex justify-center border-top py-2 bg-white">
        <div className="flex gap-2 w-full">
          <Button
            onClick={() => {
              setSessionFilterOpen(false)
            }}
            color="purple-2"
            className="w-auto grow-0 shrink-0 !py-2"
            fat
          >
            <CollapsedIcon className="icon mr-2 rotate-[-90deg] lg:rotate-0" /> Collapse
          </Button>

          <Button
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
            color="purple-2"
            className="grow !py-2"
            fat
            fill
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  )
}

export const advancedFilterKeys = ['type', 'track', 'expertise', 'room']
export const isAdvancedFilterApplied = (sessionFilter: any) => {
  return advancedFilterKeys.some(key => Object.keys(sessionFilter[key]).length > 0)
}

export const SessionFilter = ({ filterOptions }: { filterOptions: any }) => {
  const draggableLink = useDraggableLink()
  const [sessionFilterOpen, setSessionFilterOpen] = useRecoilState(sessionFilterOpenAtom)
  const [sessionFilter, setSessionFilter] = useRecoilState(sessionFilterAtom)
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const [isSticky, setIsSticky] = useState(false)
  const { isPersonalizedSchedule } = usePersonalized()

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

  return (
    <>
      <div
        className={cn(
          'flex flex-row gap-3 items-center justify-between text-xs w-full overflow-hidden lg:pt-3 mb-2',
          isPersonalizedSchedule ? 'flex-col sm:flex-row' : ''
        )}
      >
        <div className="flex flex-row gap-3 justify-between px-4 relative w-full lg:w-[350px]">
          <div data-type="session-filter-search" className="relative w-full lg:w-[350px]">
            <input
              type="text"
              value={sessionFilter.text}
              onChange={e => setSessionFilter({ ...sessionFilter, text: e.target.value })}
              placeholder="Find a session"
              className="w-full relative py-2 px-10 bg-white rounded-full border text-sm border-solid border-[#E1E4EA] focus:outline-none"
            />

            <div
              className="absolute left-4 top-0 bottom-0 h-[34px] lg:h-full cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center"
              onClick={() => setSessionFilter({ ...sessionFilter, text: '' })}
            >
              <MagnifierIcon className="text-[#99A0AE] icon" style={{ '--color-icon': '#99A0AE' }} />
            </div>

            {sessionFilter.text && (
              <div
                className="absolute right-4 top-0 h-[34px] lg:h-full cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center"
                onClick={() => setSessionFilter({ ...sessionFilter, text: '' })}
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="#99A0AE" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {!isPersonalizedSchedule && (
          <div
            data-type="session-filter-actions"
            className="flex flex-row gap-3 items-center text-xl mr-4 hidden lg:flex"
          >
            <div className="text-xs font-semibold line-clamp-2">
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

            <div
              onClick={() => setSessionFilterOpen(!sessionFilterOpen)}
              className={cn(
                'flex shrink-0 items-center xl:w-[40px] xl:h-[40px] w-[38px] h-[38px] justify-center text-xl cursor-pointer rounded-full p-2.5 hover:bg-[#dfd8fc] transition-all duration-300',
                (sessionFilterOpen || isAdvancedFilterApplied(sessionFilter)) &&
                  'bg-[#dfd8fc] fill-[#7D52F4] border border-solid border-[#cdbaff]'
              )}
            >
              <FilterIcon
                className="icon"
                style={{
                  '--color-icon': sessionFilterOpen || isAdvancedFilterApplied(sessionFilter) ? '#7d52f4' : 'black',
                  fontSize: '24px',
                }}
              />
            </div>
          </div>
        )}

        {isPersonalizedSchedule && (
          <Link to="/schedule" className="flex w-full sm:w-auto px-4 shrink-0">
            <Button color="purple-2" fill fat className="flex flex-row w-full sm:w-auto items-center gap-3">
              <CalendarIcon style={{ '--color-icon': 'white' }} /> Return to main schedule
            </Button>
          </Link>
        )}
      </div>

      {!isPersonalizedSchedule && (
        <>
          <div className="mx-4 border-bottom h-[1px] !border-[#e5e5e5] mb-3 mt-2" />

          <div className="overflow-hidden">
            <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
              <div className="flex flex-row gap-3 flex-nowrap p-1 px-4 text-xs">
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
                      'flex shrink-0 items-center justify-center align-middle rounded-full border bg-white hover:bg-[#f8f7ff] border-solid border-transparent shadow px-4 py-1 cursor-pointer select-none transition-all duration-300',
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
                      <StarIcon className="icon ml-2" style={{ '--color-icon': '#7d52f4', fontSize: '14px' }} />
                    )}
                  </div>
                ))}
              </div>
            </SwipeToScroll>
          </div>

          <div className="px-4 h-[1px] mb-0 !border-[#e5e5e5] mt-3" />
        </>
      )}

      <div
        className={cn(
          'sticky top-[55px] lg:top-[56px] z-[10] border-top border-bottom transition-all duration-300',
          isSticky ? `${css['sticky-glass']}` : 'bg-[#f5f2ff]',
          isPersonalizedSchedule ? 'mt-2' : ''
        )}
        ref={stickyRef}
      >
        {/* <SwipeToScroll scrollIndicatorDirections={{ right: true }}> */}
        <div
          className={cn(
            'flex flex-row flex-nowrap justify-between gap-2 pb-0 w-full px-4 transition-all duration-300'
            // !isSticky ? 'bg-[#f5f2ff]' : 'bg-white'
          )}
        >
          {filterOptions.day.map((day: string, index: number, array: string[]) => (
            <div
              key={day}
              className={cn(
                'cursor-pointer font-semibold flex px-2 py-3 justify-center items-center text-[#525866] border-solid border-b-[transparent] border-b-[2px] transition-all duration-300',
                (Object.keys(sessionFilter.day).length === 0 && day === 'All') || sessionFilter.day[day]
                  ? '!text-[#7D52F4] border-solid !border-b-[#7D52F4] border-b-[2px]'
                  : ''
              )}
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

                    //   const nextFilter = { ...sessionFilter.day }

                    if (active) {
                      // delete nextFilter[day]
                      setSessionFilter({ ...sessionFilter, day: {} })
                    } else {
                      // nextFilter[day] = true
                      setSessionFilter({ ...sessionFilter, day: { [day]: true } })
                    }
                  }
                }, 100)
              }}
            >
              {day}
            </div>

            //   <div
            //     key={day}
            //     className={cn(
            //       'shrink-0 cursor-pointer rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300',
            //       (Object.keys(sessionFilter.day).length === 0 && day === 'All') || sessionFilter.day[day]
            //         ? 'border-[#ac9fdf] !bg-[#EFEBFF]'
            //         : '',
            //       index === array.length - 1 ? 'mr-4' : '',
            //       day === 'Today' ? '!text-blue-800 font-semibold' : ''
            //     )}
            //     {...draggableLink}
            //     onClick={e => {
            //       const result = draggableLink.onClick(e)

            //       if (!result) return

            //       const container = document.querySelector('[data-type="session-list"]')

            //       if (container) {
            //         container.scrollIntoView({ behavior: 'smooth' })
            //       }

            //       setTimeout(() => {
            //         if (day === 'All') {
            //           setSessionFilter({ ...sessionFilter, day: {} })
            //         } else {
            //           const active = sessionFilter.day[day]

            //           //   const nextFilter = { ...sessionFilter.day }

            //           if (active) {
            //             // delete nextFilter[day]
            //             setSessionFilter({ ...sessionFilter, day: {} })
            //           } else {
            //             // nextFilter[day] = true
            //             setSessionFilter({ ...sessionFilter, day: { [day]: true } })
            //           }
            //         }
            //       }, 100)
            //     }}
            //   >
            //     {day}
            //   </div>
          ))}
        </div>
        {/* </SwipeToScroll> */}
      </div>

      <div className="px-4 !border-[#e5e5e5] h-[1px] mb-4" />

      {/* <div className="mx-4 border-bottom h-[1px]" /> */}
    </>
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
          className="right-0 left-0 flex justify-center items-center select-none sticky bottom-4 py-4 pointer-events-none"
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

const SESSIONS_PER_PAGE = 25

// Restore scroll and pagination state when going back to the page
const scrollRestorationTracker = {} as any

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
  // const [visibleSessions, setVisibleSessions] = useState<SessionType[]>([])
  const [page, setPage] = useState<number>(
    typeof window !== 'undefined' ? scrollRestorationTracker[window.history.state?.key]?.page ?? 1 : 1
  )
  const [timelineView, setTimelineView] = useRecoilState(sessionTimelineViewAtom)
  const { isPersonalizedSchedule } = usePersonalized()

  if (typeof window !== 'undefined') {
    if (!scrollRestorationTracker[window.history?.state?.key]) {
      scrollRestorationTracker[window.history?.state?.key] = {
        lastScrollY: 0,
        page: 1,
      }
    } else if (scrollRestorationTracker[window.history?.state?.key]) {
      scrollRestorationTracker[window.history?.state?.key].page = page
    }
  }

  useEffect(() => {
    if (
      scrollRestorationTracker[window.history.state?.key] &&
      scrollRestorationTracker[window.history.state?.key].lastScrollY
    ) {
      window.scrollTo({
        top: scrollRestorationTracker[window.history.state?.key].lastScrollY,
        behavior: 'smooth',
      })
    }

    const handleScroll = () => {
      if (scrollRestorationTracker[window.history.state?.key]) {
        scrollRestorationTracker[window.history.state?.key].lastScrollY = window.scrollY
      }

      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 20) {
        setPage(prevPage => prevPage + 1)
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    setPage(1)
  }, [filteredSessions])

  const visibleSessions = filteredSessions.slice(0, page * SESSIONS_PER_PAGE)

  const groupedSessions = useMemo(() => {
    return visibleSessions.reduce((acc, session) => {
      const dateTime = moment.utc(session.slot_start).add(7, 'hours').format('MMM D — h:mm A')
      if (!acc[dateTime]) {
        acc[dateTime] = []
      }
      acc[dateTime].push(session)
      return acc
    }, {} as Record<string, SessionType[]>)
  }, [visibleSessions])

  const isNativeScroll = typeof window !== 'undefined' && !window.matchMedia('not all and (hover: none)').matches

  return (
    <div data-type="session-list" className={cn(cardClass)}>
      <SessionFilter filterOptions={filterOptions} />
      {!isPersonalizedSchedule && (
        <>
          <PersonalizedSuggestions sessions={filteredSessions} />

          <div data-type="session-prompts" className="flex gap-3 mt-4 mb-3 border-bottom mx-4 pb-4">
            <StandalonePrompt className="w-full" onClick={() => setDevaBotVisible('Help me find sessions about ')}>
              <div className="truncate">Help me find sessions about...</div>
            </StandalonePrompt>
            <StandalonePrompt className="w-full" onClick={() => setDevaBotVisible('Recommend sessions related to ZKP')}>
              <div className="truncate">Recommend sessions related to ZKP</div>
            </StandalonePrompt>
          </div>
        </>
      )}
      <div className="flex flex-row justify-between items-center gap-3 px-4 mb-1">
        <div className="font-semibold flex flex-col">
          <div> {isPersonalizedSchedule ? 'Schedule Snapshot' : 'Sessions'}</div>
          {timelineView && !isNativeScroll && <div className="text-[#A897FF] text-xs">Drag the timeline to scroll</div>}
        </div>
        <div className="flex justify-evenly bg-[#EFEBFF] gap-1.5 rounded-lg p-1 mt-2 shrink-0 mb-2 self-center text-sm">
          <div
            className={cn(
              'flex justify-center items-center self-center grow rounded-md gap-2 px-2 text-[#A897FF] hover:bg-white hover:shadow-md cursor-pointer p-0.5 transition-all duration-300 select-none',
              {
                'bg-white shadow-md !text-[#7D52F4]': !timelineView,
              }
            )}
            onClick={() => setTimelineView(false)}
          >
            <ListIcon
              className="transition-all duration-300"
              style={!timelineView ? { fill: '#7D52F4', fontSize: '14px' } : { fill: '#A897FF', fontSize: '14px' }}
            />
            List View
          </div>
          <div
            className={cn(
              'flex justify-center items-center rounded-md gap-2 text-[#A897FF] px-2 hover:bg-white hover:shadow-md cursor-pointer p-0.5 transition-all duration-300 select-none',
              {
                'bg-white shadow-md !text-[#7D52F4]': timelineView,
              }
            )}
            onClick={() => {
              setTimelineView(true)

              // if (Object.keys(sessionFilter.day).length === 0) {
              //   setSessionFilter({
              //     ...sessionFilter,
              //     day: { 'Nov 12': true },
              //   })
              // }
            }}
          >
            <TimelineIcon
              className="transition-all duration-300"
              style={timelineView ? { fill: '#7D52F4', fontSize: '14px' } : { fill: '#A497FF', fontSize: '14px' }}
            />
            Timeline View
          </div>
        </div>
      </div>
      {timelineView ? (
        <Timeline
          sessions={filteredSessions}
          event={event}
          days={
            Object.keys(sessionFilter.day).length === 0
              ? ['Nov 12', 'Nov 13', 'Nov 14', 'Nov 15']
              : Object.keys(sessionFilter.day)
          }
        />
      ) : (
        Object.entries(groupedSessions).map(([date, dateSessions]) => (
          <div className="relative flex flex-col" key={date}>
            <div className={cn('font-semibold px-4 py-2 stickyz top-[107px]z z-[9] text-sm self-start')}>{date}</div>
            {dateSessions.map(session => (
              <div key={session.sourceId} className="mx-4 mb-3">
                <SessionCard session={session} />
              </div>
            ))}
          </div>
        ))
      )}

      {visibleSessions.length === 0 && (
        <div className="flex flex-col justify-center items-center h-full my-8">
          <Image src={NoResults} alt="No results" className="w-[300px] lg:max-w-[30%]" />
          <div className="mt-4 text-sm text-[#535353] font-semibold">No sessions match your filter</div>
        </div>
      )}

      {!timelineView && <ScrollUpComponent visible={visibleSessions.length > 20} />}
      {timelineView && <div className="py-4"></div>}
    </div>
  )
}

export const Livestream = ({ session, className }: { session: SessionType; className?: string }) => {
  const searchParams = useSearchParams()
  const secret = searchParams.get('secret')
  const playback = session.sources_youtubeId || session.sources_streamethId

  return (
    <div className={cn('flex flex-col shrink-0 gap-3', className)}>
      <div className={cn('flex justify-between items-center')}>
        <div className="flex flex-col gap-3 font-semibold">{playback ? 'Video Recording' : 'Livestream'}</div>
      </div>

      <div className="aspect select-none">
        {playback && session.sources_youtubeId && (
          <iframe
            src={`https://www.youtube.com/embed/${session.sources_youtubeId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-xl"
          />
        )}
        {playback && session.sources_streamethId && (
          <>
            <iframe
              src={`https://streameth.org/embed/?session=${session.sources_streamethId}&vod=true`}
              title="StreamEth video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-xl"
            />
          </>
        )}
        {!playback && (
          <div
            className="w-full h-full bg-[#784DEF1A] rounded-2xl relative flex items-center justify-center border border-solid border-[#E1E4EA]
          opacity-40 pointer-events-none"
          >
            <VideoIcon
              className="icon hover:scale-110 transition-transform duration-300 cursor-pointer"
              style={{ '--color-icon': '#7D52F4', fontSize: '40px' }}
            />
          </div>
        )}
      </div>

      <div
        className="flex justify-evenly shrink-0 text-xs border border-solid border-[#E1E4EA] rounded-2xl p-1 gap-2 my-1 font-semibold bg-white"
        // @ts-ignore
        style={{ '--color-icon': '#7D52F4' }}
      >
        <Link
          to={`https://devcon.fileverse.io/devcon7/portal?event=${session.sourceId}`}
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="text-lg hover:scale-110 transition-transform duration-300 mb-1">
            <PenIcon />
          </div>
          <p>Take Collaborative Notes</p>
          <p className="text-[10px] text-[#717784]">Powered by Fileverse</p>
        </Link>
        <Link
          to={`https://meerkat.events/e/${session.sourceId}/remote${secret ? `?secret=${secret}` : ''}`}
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="text-lg hover:scale-110 transition-transform duration-300 mb-1">
            <QuestionsIcon />
          </div>
          <p>Ask Speaker Questions</p>
          <p className="text-[10px] text-[#717784]">Powered by Meerkat</p>
        </Link>
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
  const { account, setSessionBookmark } = useAccountContext()
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const [calendarModalOpen, setCalendarModalOpen] = React.useState(false)
  const [cal, setCal] = React.useState<any>(null)
  const [selectedSession, setSelectedSession] = useRecoilState(selectedSessionAtom)

  React.useEffect(() => {
    if (!session) return
    setCal(
      generateCalendarExport({
        timezone: 'Asia/Bangkok',
        PRODID: 'app.devcon.org',
        icsFileName: session?.title,
        entries: [
          {
            start: moment.utc(session.slot_start),
            end: moment.utc(session.slot_end),
            description: session?.description,
            title: session?.title ?? '',
            location: {
              url: 'https://devcon.org',
              // text: 'QNSCC — Queen Sirikit National Convention Center',
              text: `${session?.slot_room?.name} - QNSCC — Queen Sirikit National Convention Center`,
            },
          },
        ],
      })
    )
  }, [session])
  //   const [selectedSession, setSelectedSession] = useRecoilState(selectedSessionAtom)

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
        'flex flex-col gap-3 p-4 self-start w-full no-scrollbar',
        !standalone && 'pb-0 lg:max-h-[calc(100vh-84px)] lg:overflow-auto'
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
          {session.track && <TrackTag track={session.track} className="self-start" />}
          {session.expertise && <ExpertiseTag expertise={session.expertise || ''} className="self-start" />}
        </div>

        <div
          className={cn(
            'absolute rounded-2xl flex justify-between items-end p-3 pb-1 pt-5 self-end left-0 right-0',
            css['session-gradient-2']
          )}
        >
          <div className="font-medium z-10 flex flex-col gap-2 translate-y-[3px] pb-1 text-white max-w-[70%]">
            {/* <TrackTag track={session.track} className="self-start" /> */}
            <p className="text-lg leading-6 pb-1">{session.title}</p>
          </div>
          <div className="text-2xl lg:text-lg z-10 flex flex-row self-end hidden lg:flex">
            <div
              className="shrink-0 flex self-start justify-center items-start p-2  cursor-pointer hover:scale-110 transition-all duration-300 select-none"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()

                setSessionBookmark(
                  session,
                  'attending',
                  account,
                  account?.attending_sessions?.includes(session.sourceId) ?? false
                )
              }}
            >
              {account?.attending_sessions?.includes(session.sourceId) ? (
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

                setSessionBookmark(
                  session,
                  'interested',
                  account,
                  account?.interested_sessions?.includes(session.sourceId) ?? false
                )
              }}
            >
              {account?.interested_sessions?.includes(session.sourceId) ? (
                <StarFillIcon style={{ '--color-icon': 'white' }} />
              ) : (
                <StarIcon style={{ '--color-icon': 'white' }} />
              )}
            </div>

            {/* {!standalone && (
              <Link
                className="flex justify-center items-center select-none shrink-0 p-2"
                to={`/schedule/${session.sourceId}`}
              >
                <ShareIcon
                  className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
                  style={{ '--color-icon': 'white' }}
                  //   onClick={copyShareLink}
                />
              </Link>
            )} */}
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
            {moment.utc(session.slot_start).add(7, 'hours').format('MMM Do')} —{' '}
            {moment.utc(session.slot_start).add(7, 'hours').format('h:mm A')} -{' '}
            {moment.utc(session.slot_end).add(7, 'hours').format('h:mm A')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <IconVenue className="icon shrink-0" style={{ '--color-icon': 'black' }} />
          <span className="text-sm text-[black]">
            {session.type} - {session.slot_room?.name ?? session.slot_roomId}
          </span>
        </div>

        {/* <div className="flex items-center gap-2">
          <IconSpeaker className="icon shrink-0" style={{ '--color-icon': 'black' }} />
          <span className="text-sm text-[black]">{session.speakers?.map(speaker => speaker.name).join(', ')}</span>
        </div> */}
      </div>

      <div className="flex justify-evenly shrink-0 text-xs border border-solid border-[#E1E4EA] rounded-2xl p-1 gap-2 my-1 font-semibold bg-white">
        <div
          className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
          onClick={() =>
            setSessionBookmark(
              session,
              'attending',
              account,
              account?.attending_sessions?.includes(session.sourceId) ?? false
            )
          }
        >
          <div className="text-lg hover:scale-110 transition-transform duration-300">
            {account?.attending_sessions?.includes(session.sourceId) ? (
              <IconAdded style={{ '--color-icon': '#7d52f4' }} />
            ) : (
              <CalendarIcon />
            )}
          </div>
          <p>Attend Session</p>
        </div>
        <div
          className="flex flex-col items-center justify-center gap-1 cursor-pointer group select-none"
          onClick={() =>
            setSessionBookmark(
              session,
              'interested',
              account,
              account?.interested_sessions?.includes(session.sourceId) ?? false
            )
          }
        >
          <div className="text-lg group-hover:scale-110 transition-transform duration-300">
            {account?.interested_sessions?.includes(session.sourceId) ? (
              <StarFillIcon style={{ '--color-icon': '#7d52f4' }} />
            ) : (
              <StarIcon />
            )}
          </div>
          <p>Mark as interesting</p>
        </div>

        <div
          className="flex flex-col items-center justify-center gap-1 cursor-pointer group select-none"
          onClick={() => setCalendarModalOpen(true)}
        >
          <div className="text-lg group-hover:scale-110 transition-transform duration-300">
            <IconCalendar />
          </div>
          <p>Export to Calendar</p>
        </div>

        {cal && (
          <Modal open={calendarModalOpen} close={() => setCalendarModalOpen(false)}>
            <ModalContent
              className="border-solid border-[#8B6BBB] border-t-4 w-[560px]"
              close={() => setCalendarModalOpen(false)}
            >
              <div className="relative">
                <Image src={CalendarExport} alt="Calendar Share" className="w-full h-auto"></Image>
                <p className="absolute text-xs font-bold top-4 left-4 text-uppercase">Add To Calendar</p>
              </div>
              <div className="p-4">
                <p className="font-bold">Add {session.title} to your external calendar!</p>

                <p className="text-sm">Download the .ics file to upload to your favorite calendar app.</p>

                <div className="flex mt-4 flex-row gap-4 items-center">
                  <a {...cal.icsAttributes}>
                    <Button fat color="purple-1">
                      <span className="mr-2">Download (.ics)</span>
                      <IconCalendar />
                    </Button>
                  </a>
                  <Link to={cal.googleCalUrl} className="h-full">
                    <Button fat color="purple-1" fill>
                      Google Calendar
                    </Button>
                  </Link>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* <Link to={standalone ? `/venue?room=${session.room?.id}` : `/venue/${session.room?.id}`}>
          <p>Room Details</p> <PinIcon />
        </Link> */}
      </div>

      <div className="shrink-0">
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible(`Tell me about similar sessions to "${session.title}"`)}
        >
          <div className="truncate">Tell me about similar sessions</div>
        </StandalonePrompt>
      </div>

      {session.speakers && session.speakers.length > 0 && (
        <>
          <div className="flex flex-col gap-3 font-semibold border-top pt-3 mt-1 shrink-0">Speakers</div>

          <div className="flex flex-col gap-3 shrink-0">
            {session.speakers?.map(speaker => (
              <SpeakerCard speaker={speaker} key={speaker.id} />
            ))}
          </div>
        </>
      )}

      <Livestream session={session} className="border-top pt-2 shrink-0 lg:hidden" />

      {!standalone && (
        <div className="sticky bottom-0 left-0 right-0 shrink-0 flex justify-center border-top py-2 bg-white">
          <div className="flex gap-2 w-full">
            <Button
              onClick={() => {
                setSelectedSession(null)
              }}
              color="purple-2"
              className="w-auto grow-0 shrink-0 !py-2"
              fat
            >
              <CollapsedIcon className="icon mr-2 rotate-[-90deg] lg:rotate-0" /> Collapse
            </Button>

            <Link to={`/schedule/${session.sourceId}`} className="flex w-auto grow shrink-0">
              <Button color="purple-2" className="grow !py-2" fat fill>
                <ExpandedIcon className="icon mr-2" style={{ fontSize: '14px' }} />
                Expand Session
              </Button>
            </Link>
          </div>
        </div>
      )}
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
      data-type="session-layout"
      className={cn('flex flex-row lg:gap-3 relative')}
      // initial={{ opacity: 0 }}
      // animate={{ opacity: 1 }}
      // transition={{ duration: 1 }}
    >
      {/* <Timeline sessions={sessions} event={event} /> */}

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

      <div className={cn('block lg:hidden z-[20]')}>
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
