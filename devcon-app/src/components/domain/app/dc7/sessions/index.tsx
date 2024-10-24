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
import { selectedSessionAtom } from 'pages/_app'
import { StandalonePrompt } from 'lib/components/ai/standalone-prompt'
import { useDraggableLink } from 'lib/hooks/useDraggableLink'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import ShareIcon from 'assets/icons/arrow-curved.svg'
import { devaBotVisibleAtom } from 'pages/_app'
import { useRouter } from 'next/router'
import { Toaster } from 'lib/components/ui/toaster'
import { motion } from 'framer-motion'
import { useToast } from 'lib/hooks/use-toast'

const cardClass = 'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative'

const useSessionFilter = (sessions: SessionType[]) => {
  const [text, setText] = useState('')
  const [type, setType] = useState('All')
  const [selectedDay, setSelectedDay] = useState('')

  return {
    filteredSessions: sessions,
    filters: {
      text,
      setText,
      type,
      setType,
      selectedDay,
      setSelectedDay,
    },
  }

  //   const filteredSessions = useMemo(() => {
  //     if (!sessions) return []
  //     return sessions.filter(
  //       session =>
  //         session.title.toLowerCase().includes(text.toLowerCase()) &&
  //         (type === 'All' || session.type === type) &&
  //         (selectedLetter === '' || session.title[0].toUpperCase() === selectedLetter)
  //     )
  //   }, [sessions, text, type, selectedLetter])

  //   const noFiltersActive = text === '' && type === 'All'

  //   return {
  //     filteredSessions,
  //     filters: {
  //       text,
  //       setText,
  //       type,
  //       setType,
  //       selectedLetter,
  //       setSelectedLetter,
  //     },
  //     noFiltersActive,
  //   }
}

export const SessionCard = ({
  id,
  title,
  speakers,
  track,
  date,
  startTime,
  endTime,
  startTimeAsMoment,
  endTimeAsMoment,
  image,
  description,
  expertise,
}: SessionType) => {
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

  let trackLogo

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

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-md w-full overflow-hidden">
      <div className="flex justify-between h-[100px]">
        <div className="basis-[100px] shrink-0 bg-purple-200 flex items-center justify-center relative overflow-hidden">
          <div
            className={cn(
              'absolute top-0 w-full text-xs text-white font-semibold p-2 z-[1] h-[52px] line-clamp-3 break-words',
              css['expertise-gradient']
            )}
          >
            {track}
          </div>
          {trackLogo && (
            <Image
              src={trackLogo}
              alt={track}
              height={100}
              width={100}
              className="w-full h-[90%] object-contain transform translate-x-1/4 -translate-y-1/6"
            />
          )}

          <div className="absolute bottom-1 w-full left-1 flex">
            <div className="text-[10px] text-black rounded-full bg-[#b3a1fd] px-2 py-0.5 font-semibold">
              {expertise}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between grow p-2 pl-3">
          <div>
            <p className="text-sm font-medium text-gray-800 line-clamp-2">{title}</p>
            {/* <p className="text-xs text-gray-600 mt-1 truncate">{track}</p> */}
          </div>
          <div>
            {/* <p className="text-xs text-gray-600 mt-1 line-clamp-2 mb-1">{description}</p> */}
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

        <div className="shrink-0 flex  justify-center p-3 pl-1 cursor-pointer">
          <CalendarIcon className="icon" style={{ '--color-icon': '#99A0AE' }} />
          {/* <p className="text-sm font-semibold text-gray-800 truncate">{date}</p> */}
        </div>
      </div>
    </div>
  )
}

export const SessionFilter = (props: any) => {
  return <div>SessionFilter</div>
}

const SESSIONS_PER_PAGE = 25

export const SessionList = ({ sessions }: { sessions: SessionType[] }) => {
  const [selectedSession, setSelectedSession] = useRecoilState(selectedSessionAtom)
  const { filteredSessions, filters } = useSessionFilter(sessions)
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const draggableLink = useDraggableLink()

  const [isSticky, setIsSticky] = useState(false)
  const stickyRef = useRef<HTMLDivElement>(null)
  const [visibleSessions, setVisibleSessions] = useState<SessionType[]>([])
  const [page, setPage] = useState(1)

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

  return (
    <div data-type="session-list" className={cn(cardClass)}>
      <SessionFilter filters={filters} />

      <div className="flex flex-col gap-3 pb-4 lg:px-4 font-semibold">Featured Sessions</div>

      <div className="overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3">
            {visibleSessions.slice(0, 10).map((session, index) => (
              <div
                key={session.id}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 shrink-0 cursor-pointer hover:border-[#ac9fdf] transition-all duration-300',
                  selectedSession?.id === session.id ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
                  index === 0 ? 'lg:ml-4' : ''
                )}
                {...draggableLink}
                onClick={e => {
                  const result = draggableLink.onClick(e)

                  if (!result) return

                  if (selectedSession?.id === session.id) {
                    setSelectedSession(null)
                  } else {
                    setSelectedSession(session)
                  }
                }}
              >
                <div className="relative rounded-full w-[80px] h-[80px]">
                  <Image
                    src={session.image || '/default-session-image.png'}
                    alt={session.title}
                    width={80}
                    height={80}
                    className="rounded-full w-full h-full mb-2 object-cover"
                  />
                  <div className={cn('absolute inset-0 rounded-full', css['session-gradient'])} />
                </div>
                <p className="text-xs font-medium text-center line-clamp-2">{session.title}</p>
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

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

      <div className="flex flex-col gap-3 lg:px-4 font-semibold">All Sessions</div>

      <div
        className={cn('sticky top-[55px] lg:top-[56px] z-[10] overflow-hidden', isSticky ? css['sticky-glass'] : '')}
        ref={stickyRef}
      >
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row flex-nowrap gap-3 lg:p-4 py-3 w-full">
            {['All', 'Today', 'Tomorrow', ...Array.from('MTWHF')].map((day, index, array) => (
              <div
                key={day}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300',
                  day === filters.selectedDay ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
                  index === array.length - 1 ? 'mr-4' : ''
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
                    filters.setSelectedDay(filters.selectedDay === day ? '' : day)
                  }, 100)
                }}
              >
                {day}
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <motion.div className="flex flex-col gap-3 mb-4 lg:px-4">
        {visibleSessions.map((session, index) => {
          return (
            <motion.div key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SessionCard {...session} />
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

export const SessionView = ({ session }: { session: SessionType }) => {
  return <div>SessionView</div>
}

export const SessionLayout = ({ sessions }: { sessions: SessionType[] | null }) => {
  const [selectedSession, _] = useRecoilState(selectedSessionAtom)

  if (!sessions) return null

  return (
    <motion.div
      data-type="speaker-layout"
      className={cn('flex flex-row lg:gap-3 relative')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className={cn('basis-[60%] grow', selectedSession ? 'hidden lg:block' : '')}>
        <SessionList sessions={sessions} />
      </div>

      {selectedSession && (
        <div
          className={cn('basis-[100%] lg:basis-[40%] lg:min-w-[393px] max-w-[100%] sticky top-[72px] lg:self-start')}
        >
          <SessionView session={selectedSession} />
        </div>
      )}

      <Toaster />
    </motion.div>
  )
}

export const Sessions = () => {
  return <div>Sessions</div>
}
