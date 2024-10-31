import React, { useEffect, useMemo, useRef, useState } from 'react'
import cn from 'classnames'
import { Separator } from 'lib/components/ui/separator'
import { Speaker as SpeakerType } from 'types/Speaker'
import FilterIcon from 'assets/icons/filter-tract.svg'
import HeartIcon from 'assets/icons/heart.svg'
import MagnifierIcon from 'assets/icons/magnifier.svg'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import Image from 'next/image'
import css from './speakers.module.scss'
import { StandalonePrompt } from 'lib/components/ai/standalone-prompt'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { devaBotVisibleAtom, selectedSpeakerSelector, sessionsAtom, speakerFilterAtom } from 'pages/_app'
import TwitterIcon from 'assets/icons/twitter.svg'
import { Link } from 'components/common/link'
import { SessionCard, tagClassTwo } from 'components/domain/app/dc7/sessions/index'
import { useDraggableLink } from 'lib/hooks/useDraggableLink'
import { selectedSpeakerAtom } from 'pages/_app'
import { useWindowWidth } from '../../Layout'
import ShareIcon from 'assets/icons/arrow-curved.svg'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
// import { useToast } from 'lib/hooks/use-toast'
// import { Button } from 'lib/components/button'
import { ScrollUpComponent } from '../sessions'
import { Popup } from 'lib/components/pop-up'
import { useAccountContext } from 'context/account-context'
import moment from 'moment'
// import { SessionFilterAdvanced } from '../sessions'

export const cardClass =
  'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative lg:bg-[#fbfbfb]'

// const useSpeakerFilter = (speakers: SpeakerType[] | null) => {

//   const filterOptions = useMemo(() => {
//     return {
//       type: [...new Set(sessions.map(session => session.type))],
//       day: ['All', 'Nov 12', 'Nov 13', 'Nov 14', 'Nov 15'],
//       expertise: [...new Set(sessions.map(session => session.expertise))],
//       track: [...new Set(sessions.map(session => session.track))],
//       room: [...new Set(sessions.map(session => session.room))],
//       other: ['Attending', 'Upcoming', 'Interested In', 'Past'],
//     }
//   }, [sessions])

//   const filteredSessions = useMemo(() => {
//     return sessions.filter((session: any) => {
//       const matchesText =
//         session.title.toLowerCase().includes(text.toLowerCase()) ||
//         session.description.toLowerCase().includes(text.toLowerCase()) ||
//         session.speakers?.some((speaker: any) => speaker.name.toLowerCase().includes(text.toLowerCase())) ||
//         session.expertise.toLowerCase().includes(text.toLowerCase()) ||
//         session.type.toLowerCase().includes(text.toLowerCase()) ||
//         session.track.toLowerCase().includes(text.toLowerCase())

//       const isAttending = attendingSessions[session.id]
//       const isInterested = interestedSessions[session.id]

//       const matchesType = Object.keys(type).length === 0 || sessionFilter.type[session.type]
//       const matchesDay = Object.keys(day).length === 0 || moment(session.date).format('MMM D') === day
//       const matchesExpertise = Object.keys(expertise).length === 0 || sessionFilter.expertise[session.expertise]
//       const matchesTrack = Object.keys(track).length === 0 || sessionFilter.track[session.track]
//       const matchesRoom = Object.keys(room).length === 0 || sessionFilter.room[session.room]

//       const matchesAttending = sessionFilter.other['Attending'] && isAttending
//       const matchesInterested = sessionFilter.other['Interested In'] && isInterested
//       //   let matchesPast = sessionFilter.other['Past'] && now?.isAfter(moment(session.endTime))
//       //   let matchesUpcoming = sessionFilter.other['Upcoming'] && now?.isBefore(moment(session.startTime))

//       const matchesOther = matchesAttending || matchesInterested || Object.keys(other).length === 0

//       return matchesText && matchesType && matchesDay && matchesExpertise && matchesTrack && matchesRoom && matchesOther
//     })
//   }, [sessions, sessionFilter, attendingSessions, interestedSessions])

//   return {
//     filteredSessions,
//     filterOptions,
//   }
// }

const useSpeakerFilter = (speakers: SpeakerType[] | null) => {
  const { account } = useAccountContext()
  const sessions = useRecoilValue(sessionsAtom)
  const [speakerFilter, setSpeakerFilter] = useRecoilState(speakerFilterAtom)

  const filterOptions = useMemo(() => {
    return {
      type: [...new Set(speakers?.flatMap(speaker => speaker.sessions?.map(session => session.type)))],
      letter: [
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
      ],
      // expertise: [...new Set(sessions?.map(session => session.expertise))],
      // track: [...new Set(sessions?.map(session => session.track))],
      // room: [...new Set(sessions?.map(session => session.room))],
      // favorited: [...new Set(speakers?.map(speaker => speaker.favorited))]
    }
  }, [sessions])

  const filteredSpeakers = useMemo(() => {
    if (!speakers) return []

    return speakers.filter(speaker => {
      const isFavorited = account?.favorite_speakers?.includes(speaker.id)

      const matchesText = speaker.name.toLowerCase().includes(speakerFilter.text.toLowerCase())
      const matchesLetter = speakerFilter.letter === '' || speaker.name[0].toUpperCase() === speakerFilter.letter
      const matchesType =
        Object.keys(speakerFilter.type).length === 0 ||
        speaker.sessions?.some((session: any) => speakerFilter.type[session.type])

      if (speakerFilter.favorited) {
        return matchesText && matchesType && matchesLetter && isFavorited
      }

      return matchesText && matchesType && matchesLetter
    })
  }, [speakers, speakerFilter])

  return {
    filteredSpeakers,
    filterOptions,
  }
}

export const SpeakerCard = ({ speaker }: { speaker: SpeakerType }) => {
  const { account, setSpeakerFavorite } = useAccountContext()
  const [selectedSpeaker, setSelectedSpeaker] = useRecoilState(selectedSpeakerAtom)
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const pathname = usePathname()
  const windowWidth = useWindowWidth()
  const isLargeScreen = windowWidth > 1024

  return (
    <Link
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 shrink-0 cursor-pointer hover:border-[#ac9fdf] transition-all duration-300',
        selectedSpeaker?.sourceId === speaker.sourceId && pathname === '/speakers'
          ? 'border-[#ac9fdf] !bg-[#EFEBFF]'
          : ''
      )}
      to={`/speakers/${speaker.sourceId}`}
      onClick={(e: any) => {
        if (pathname === '/speakers' && isLargeScreen) e.preventDefault()

        // Only null if we are on the speakers page (otherwise we want to keep the speaker selected)
        if (isLargeScreen) {
          if (selectedSpeaker?.sourceId === speaker.sourceId && pathname === '/speakers') {
            setSelectedSpeaker(null)
          } else {
            setSelectedSpeaker(speaker)
          }
        }

        setDevaBotVisible(false)
      }}
    >
      <div className="relative flex flex-row items-center gap-4">
        <Image
          // @ts-ignore
          src={speaker.avatar}
          alt={speaker.name}
          width={48}
          height={48}
          className="rounded-full w-[48px] h-[48px] object-cover"
        />
        <div className="flex flex-col">
          <div className="text-sm font-semibold">{speaker.name}</div>
          {speaker.sessions && speaker.sessions?.length > 0 && (
            <div className="text-xs text-[#717784]">{speaker.sessions?.length} sessions</div>
          )}
          {speaker?.twitter && (
            <div
              onClick={e => window.open(`https://twitter.com/${speaker.twitter}`, '_blank')}
              className="flex items-center gap-2 self-start text-xs"
            >
              <div>@{speaker.twitter}</div>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'flex items-center justify-center p-2 hover:scale-110 transition-transform duration-300',
          account?.favorite_speakers?.includes(speaker.id) ? 'text-[#ac9fdf]' : ''
        )}
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()

          setSpeakerFavorite(speaker.id, account?.favorite_speakers?.includes(speaker.id) ?? false, account)
        }}
      >
        <HeartIcon
          className="icon"
          style={{ '--color-icon': account?.favorite_speakers?.includes(speaker.id) ? '#7d52f4' : '#99A0AE' }}
        />
      </div>
    </Link>
  )
}

export const SpeakerFilter = ({ filterOptions }: { filterOptions: any }) => {
  const [speakerFilter, setSpeakerFilter] = useRecoilState(speakerFilterAtom)
  const draggableLink = useDraggableLink()

  const updateTypeFilter = (type: string) => {
    const toggled = speakerFilter.type[type]

    const nextFilter = { ...speakerFilter, type: { ...speakerFilter.type, [type]: true } }

    if (!toggled) {
      setSpeakerFilter(nextFilter)
    } else {
      delete nextFilter.type[type]

      setSpeakerFilter(nextFilter)
    }
  }

  return (
    <div data-type="speaker-filter" className="flex flex-col gap-3">
      <div className="flex flex-row gap-3 justify-between w-full px-4 lg:pt-4 pb-2">
        <div data-type="speaker-filter-search" className="relative w-full lg:w-[350px]">
          <input
            type="text"
            value={speakerFilter.text}
            onChange={e => setSpeakerFilter({ ...speakerFilter, text: e.target.value })}
            placeholder="Find a speaker"
            className="w-full relative py-2 px-10 bg-white rounded-full border text-sm border-solid border-[#E1E4EA] focus:outline-none"
          />

          <div
            className="absolute left-4 top-0 bottom-0 h-[34px] lg:h-full cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center"
            onClick={() => setSpeakerFilter({ ...speakerFilter, text: '' })}
          >
            <MagnifierIcon className="text-[#99A0AE] icon" style={{ '--color-icon': '#99A0AE' }} />
          </div>

          {speakerFilter.text && (
            <div
              className="absolute right-4 top-0 h-[34px] lg:h-full cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-center"
              onClick={() => setSpeakerFilter({ ...speakerFilter, text: '' })}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="#99A0AE" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        <div data-type="speaker-filter-actions" className="flex flex-row gap-3 items-center text-xl pr-2">
          {/* <FilterIcon
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': '#99A0AE' }}
          /> */}
          <HeartIcon
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': speakerFilter.favorited ? '#7d52f4' : '#99A0AE' }}
            onClick={() => setSpeakerFilter({ ...speakerFilter, favorited: !speakerFilter.favorited })}
          />
        </div>
      </div>

      <div className="mx-4 border-bottom h-[1px]" />

      <div className="flex flex-row gap-3 items-center text-xs overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3 flex-nowrap p-1 px-4">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center align-middle rounded-full border border-solid bg-white hover:bg-[#EFEBFF] border-transparent shadow px-4 py-1  cursor-pointer select-none transition-all duration-300',
                Object.keys(speakerFilter.type).length === 0 ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : ''
              )}
              {...draggableLink}
              onClick={e => {
                const result = draggableLink.onClick(e)

                if (!result) return

                setSpeakerFilter({ ...speakerFilter, type: {} })
              }}
            >
              All
            </div>
            <Separator orientation="vertical" className="h-6" />

            {filterOptions.type.map((type: string) => (
              <div
                key={type}
                className={cn(
                  'flex shrink-0 items-center justify-center align-middle rounded-full border bg-white hover:bg-[#f8f7ff] border-solid border-transparent shadow px-4 py-1 cursor-pointer select-none transition-all duration-300',
                  speakerFilter.type[type] ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : ''
                )}
                onClick={() => updateTypeFilter(type)}
              >
                {type}
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <div className="mx-4 mb-4 border-bottom h-[1px]" />
    </div>
  )
}

const SPEAKERS_PER_PAGE = 30

export const SpeakerList = ({ speakers }: { speakers: SpeakerType[] | null }) => {
  const [selectedSpeaker, setSelectedSpeaker] = useRecoilState(selectedSpeakerAtom)
  const [speakerFilter, setSpeakerFilter] = useRecoilState(speakerFilterAtom)
  const { filteredSpeakers, filterOptions } = useSpeakerFilter(speakers)
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const draggableLink = useDraggableLink()
  const pathname = usePathname()
  const windowWidth = useWindowWidth()
  const isLargeScreen = windowWidth > 1024

  const [isSticky, setIsSticky] = useState(false)
  const stickyRef = useRef<HTMLDivElement>(null)
  const [visibleSpeakers, setVisibleSpeakers] = useState<SpeakerType[]>([])
  const [page, setPage] = useState(1)
  const featuredSpeakers = useMemo(
    () =>
      speakers?.filter(speaker =>
        speaker.sessions?.some(session => session.featured && moment(session.slot_start).isAfter(moment()))
      ) ?? filteredSpeakers.slice(0, page * SPEAKERS_PER_PAGE).sort(() => Math.random() - 0.5),
    [speakers, filteredSpeakers, page]
  )

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
  }, [filteredSpeakers])

  useEffect(() => {
    setVisibleSpeakers(filteredSpeakers.slice(0, page * SPEAKERS_PER_PAGE))
  }, [page, filteredSpeakers])

  return (
    <div data-type="speaker-list" className={cn(cardClass)}>
      <SpeakerFilter filterOptions={filterOptions} />

      <div className="flex flex-col gap-3 pb-4 px-4 font-semibold">Featured Speakers</div>

      <div className="overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3">
            {featuredSpeakers.map((speaker, index) => (
              <Link
                to={`/speakers/${speaker.sourceId}`}
                key={speaker.sourceId}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 shrink-0 cursor-pointer hover:border-[#ac9fdf] transition-all duration-300',
                  selectedSpeaker?.sourceId === speaker.sourceId ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
                  index === 0 ? 'ml-4' : ''
                )}
                {...draggableLink}
                onClick={(e: any) => {
                  const result = draggableLink.onClick(e)

                  if (!result) return

                  if (pathname === '/speakers' && isLargeScreen) e.preventDefault()

                  if (isLargeScreen) {
                    if (selectedSpeaker?.sourceId === speaker.sourceId && pathname === '/speakers') {
                      setSelectedSpeaker(null)
                    } else {
                      setSelectedSpeaker(speaker)
                    }
                  }

                  setDevaBotVisible(false)
                }}
              >
                <div className="relative rounded-full w-[80px] h-[80px]">
                  <Image
                    // @ts-ignore
                    src={speaker.avatar}
                    alt={speaker.name}
                    width={80}
                    height={80}
                    className="rounded-full w-full h-full mb-2 object-cover"
                  />
                  <div className={cn('absolute inset-0 rounded-full', css['speaker-gradient'])} />
                </div>
                <p className="text-xs font-medium">{speaker.name}</p>
              </Link>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <div data-type="speaker-prompts" className="flex gap-3 my-4 border-bottom mx-4 pb-4">
        <StandalonePrompt className="w-full" onClick={() => setDevaBotVisible('Recommend speakers who know about ')}>
          <div className="truncate">Recommend speakers who know about...</div>
        </StandalonePrompt>
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible('Help me find a speaker that is similar to')}
        >
          <div className="truncate">Help me find a speaker that is similar to...</div>
        </StandalonePrompt>
      </div>

      <div className="flex flex-col gap-3 px-4 font-semibold">Speakers</div>

      <div
        className={cn('sticky top-[55px] lg:top-[56px] z-[10] overflow-hidden', isSticky ? css['sticky-glass'] : '')}
        ref={stickyRef}
      >
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row flex-nowrap gap-3 p-4 py-3 w-full">
            {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((letter, index, array) => (
              <div
                key={letter}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full bg-white border border-solid border-[#E1E4EA] w-[26px] h-[26px] text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300',
                  letter === speakerFilter.letter ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
                  index === array.length - 1 ? 'mr-4' : '' // Add right margin to the last item
                )}
                {...draggableLink}
                onClick={e => {
                  const result = draggableLink.onClick(e)

                  if (!result) return

                  const container = document.querySelector('[data-type="speaker-list"]')

                  if (container) {
                    container.scrollIntoView({ behavior: 'smooth' })
                  }

                  setTimeout(() => {
                    setSpeakerFilter({ ...speakerFilter, letter: speakerFilter.letter === letter ? '' : letter })
                  }, 100)
                }}
              >
                {letter}
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <motion.div className="flex flex-col gap-3 mb-4 px-4">
        {visibleSpeakers.map((speaker, index) => {
          return (
            <motion.div
              key={speaker.sourceId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              // transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <SpeakerCard speaker={speaker} />
            </motion.div>
          )
        })}

        {/* {visibleSpeakers.length < filteredSpeakers.length && <LoadMoreTrigger onLoadMore={loadMoreHandler} />} */}
      </motion.div>
      <ScrollUpComponent visible={visibleSpeakers.length > 20} />
    </div>
  )
}

export const SpeakerSessions = ({
  speaker,
  standalone,
  className,
}: {
  speaker: SpeakerType | null
  standalone?: boolean
  className?: string
}) => {
  return (
    <div className={cn(className)}>
      <div className="flex flex-col gap-3 font-semibold shrink-0 mb-3">Sessions</div>
      <div className="flex flex-col gap-3 shrink-0">
        {speaker?.sessions?.map(session => (
          <SessionCard key={session.sourceId} session={session} />
        ))}
      </div>
    </div>
  )
}

export const SpeakerView = ({ speaker, standalone }: { speaker: SpeakerType | null; standalone?: boolean }) => {
  const { account, setSpeakerFavorite } = useAccountContext()
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)

  if (!speaker) return null

  return (
    <div
      data-type="speaker-view"
      className={cn(
        cardClass,
        'flex flex-col gap-3 p-4 self-start w-full no-scrollbar',
        !standalone && 'lg:max-h-[calc(100vh-84px)] lg:overflow-auto'
      )}
    >
      {/* <Button color="black-1" fill className="self-center text-sm sticky top-[76px] z-10">
        Back to Overview
      </Button> */}
      <div className="relative rounded-2xl w-full h-full flex items-end bg-purple-200 border border-solid border-[#cdbaff] lg:border-[#E1E4EA] shrink-0">
        <Image
          // @ts-ignore
          src={speaker?.avatar}
          // @ts-ignore
          alt={speaker?.name}
          width={393}
          height={393}
          className={cn(
            'rounded-2xl w-full h-full aspect-video',
            speaker.avatar?.startsWith('data') ? 'object-contain object-center' : 'object-cover object-[50%_40%]'
          )}
        />
        <div
          className={cn(
            'absolute rounded-2xl flex justify-between items-end p-3 pt-7 self-end left-0 right-0',
            css['speaker-gradient-2']
          )}
        >
          {/* <div className={cn('absolute inset-0 rounded-bl-2xl rounded-br-2xl z-[10]', css['speaker-gradient-2'])} /> */}
          <div className="font-medium z-10 text-lg translate-y-[3px] text-white max-w-[70%]">{speaker?.name}</div>
          <div className="text-2xl lg:text-lg z-10 flex flex-row gap-4">
            <HeartIcon
              onClick={() =>
                setSpeakerFavorite(speaker.id, account?.favorite_speakers?.includes(speaker.id) ?? false, account)
              }
              className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
              style={{ '--color-icon': account?.favorite_speakers?.includes(speaker.id) ? 'red' : 'white' }}
            />

            {/* {!standalone && (
              <Link className="flex justify-center items-center" to={`/speakers/${speaker.sourceId}`}>
                <ShareIcon
                  className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
                  style={{ '--color-icon': 'white' }}
                  // onClick={copyShareLink}
                />
              </Link>
            )} */}

            {speaker?.twitter && (
              <Link className="flex justify-center items-center" to={`https://twitter.com/${speaker.twitter}`}>
                <TwitterIcon
                  className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
                  style={{ '--color-icon': 'white' }}
                />
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3  font-semibold shrink-0">Profile</div>
      <div className="text-sm text-[#717784] shrink-0">{speaker?.description}</div>
      {/* {speaker?.twitter && (
        <Link
          className="flex items-center justify-center gap-1 self-start"
          to={`https://twitter.com/${speaker.twitter}`}
        >
          <TwitterIcon
            className="icon flex justify-center items-center"
            style={{ '--color-icon': '#7D52F4', fontSize: '16px' }}
          />
          <div className="hover:text-[#7D52F4]">@{speaker.twitter}</div>
        </Link>
      )} */}

      <div className={cn('border-top pt-4 shrink-0', !standalone && 'pb-4 border-bottom')}>
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible(`Tell me what I should ask ${speaker?.name} about`)}
        >
          <div className="truncate">Tell me what I should ask {speaker?.name} about</div>
        </StandalonePrompt>
      </div>

      <SpeakerSessions speaker={speaker} className={cn(standalone && '!border-none shrink-0 lg:hidden')} />

      {!standalone && (
        <div className="sticky bottom-0 left-0 right-0 flex justify-center shrink-0">
          <Link
            to={`/speakers/${speaker.sourceId}`}
            className={tagClassTwo(false, 'text-[black] font-semibold')}
            indicateExternal
          >
            Expand Speaker Page
          </Link>
        </div>
      )}
    </div>
  )
}

export const SpeakerLayout = ({ speakers }: { speakers: SpeakerType[] | null }) => {
  const [_, setSelectedSpeaker] = useRecoilState(selectedSpeakerAtom)
  const [speakerFilterOpen, setSpeakerFilterOpen] = useState(false)
  // Important to use the selector here to get the full speaker object
  const selectedSpeaker = useRecoilValue(selectedSpeakerSelector)

  if (!speakers) return null

  return (
    <div
      data-type="speaker-layout"
      className={cn('flex flex-row lg:gap-3 relative')}
      // initial={{ opacity: 0 }}
      // animate={{ opacity: 1 }}
      // transition={{ duration: 1 }}
    >
      <div className={cn('basis-[60%] grow', selectedSpeaker ? 'hiddenz lg:blockz' : '')}>
        <SpeakerList speakers={speakers} />
      </div>

      {/* <div className="block lg:hidden">
        <Popup open={!!selectedSpeaker} setOpen={() => setSelectedSpeaker(null)}>
          <div
            className={cn(
              'basis-[100%] lg:basis-[40%] lg:min-w-[393px] max-w-[100%] lg:sticky lg:top-[72px] lg:self-start'
            )}
          >
            <SpeakerView speaker={selectedSpeaker} />
          </div>
        </Popup>
      </div> */}

      {selectedSpeaker && (
        <div className={cn('basis-[40%] min-w-[393px] max-w-[100%] sticky top-[72px] self-start hidden lg:block')}>
          <SpeakerView speaker={selectedSpeaker} />
        </div>
      )}

      {/* {sessionFilterOpen && (
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
      </div> */}
    </div>
  )
}
