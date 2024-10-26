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
import { useRecoilState, useRecoilValue } from 'recoil'
import { devaBotVisibleAtom, selectedSpeakerSelector } from 'pages/_app'
import TwitterIcon from 'assets/icons/twitter.svg'
import { Link } from 'components/common/link'
import { SessionCard } from 'components/domain/app/dc7/sessions/index'
import { useDraggableLink } from 'lib/hooks/useDraggableLink'
import { selectedSpeakerAtom } from 'pages/_app'
import ShareIcon from 'assets/icons/arrow-curved.svg'
import { usePathname } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { useToast } from 'lib/hooks/use-toast'
import { Button } from 'lib/components/button'
import { ScrollUpComponent } from '../sessions'
import { Popup } from 'lib/components/pop-up'

const cardClass = 'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative'

const useSpeakerFilter = (speakers: SpeakerType[] | null) => {
  const [text, setText] = useState('')
  const [type, setType] = useState('All')
  const [selectedLetter, setSelectedLetter] = useState('')

  const filteredSpeakers = useMemo(() => {
    if (!speakers) return []
    return speakers.filter(
      speaker =>
        speaker.name.toLowerCase().includes(text.toLowerCase()) &&
        (type === 'All' || speaker.sessions?.some(session => session.type === type)) &&
        (selectedLetter === '' || speaker.name[0].toUpperCase() === selectedLetter)
    )
  }, [speakers, text, type, selectedLetter])

  const noFiltersActive = text === '' && type === 'All'

  return {
    filteredSpeakers,
    filters: {
      text,
      setText,
      type,
      setType,
      selectedLetter,
      setSelectedLetter,
    },
    noFiltersActive,
  }
}

export const SpeakerCard = ({ speaker }: { speaker: SpeakerType }) => {
  const [selectedSpeaker, setSelectedSpeaker] = useRecoilState(selectedSpeakerAtom)
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  // TODO: Add favorited to user account
  const [favorited, setFavorited] = useState(false)
  // const router = useRouter()
  const pathname = usePathname()

  return (
    <Link
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 shrink-0 cursor-pointer hover:border-[#ac9fdf] transition-all duration-300',
        selectedSpeaker?.id === speaker.id && pathname === '/speakers' ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : ''
      )}
      to={'/speakers'}
      onClick={(e: any) => {
        if (pathname === '/speakers') e.preventDefault()

        // Only null if we are on the speakers page (otherwise we want to keep the speaker selected)
        if (selectedSpeaker?.id === speaker.id && pathname === '/speakers') {
          setSelectedSpeaker(null)
        } else {
          setSelectedSpeaker(speaker)
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
          <div className="text-sm font-medium">{speaker.name}</div>
          {speaker.sessions && speaker.sessions?.length > 0 && (
            <div className="text-xs text-[#717784]">{speaker.sessions?.length} sessions</div>
          )}
          {speaker?.twitter && (
            <Link className="flex items-center gap-2 self-start text-xs" to={`https://twitter.com/${speaker.twitter}`}>
              <div>@{speaker.twitter}</div>
            </Link>
          )}
        </div>
      </div>

      <div
        className={cn(
          'flex items-center justify-center p-2 hover:scale-110 transition-transform duration-300',
          favorited ? 'text-[#ac9fdf]' : ''
        )}
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()

          setFavorited(!favorited)
        }}
      >
        <HeartIcon className="icon" style={{ '--color-icon': favorited ? 'red' : '#99A0AE' }} />
      </div>
    </Link>
  )
}

export const SpeakerFilter = ({
  filters,
}: {
  filters: {
    text: string
    setText: (text: string) => void
    type: string
    setType: (type: string) => void
  }
}) => {
  const draggableLink = useDraggableLink()

  return (
    <div data-type="speaker-filter" className="flex flex-col gap-3">
      <div className="flex flex-row gap-3 justify-between w-full lg:px-4 lg:pt-4 pb-2">
        <div data-type="speaker-filter-search" className="relative">
          <input
            type="text"
            value={filters.text}
            onChange={e => filters.setText(e.target.value)}
            placeholder="Find a speaker"
            className="w-full py-2 px-4 pl-10 bg-white rounded-full border text-sm border-solid border-[#E1E4EA] focus:outline-none"
          />

          <MagnifierIcon
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#99A0AE] icon"
            style={{ '--color-icon': '#99A0AE' }}
          />
        </div>

        <div data-type="speaker-filter-actions" className="flex flex-row gap-3 items-center text-xl pr-2">
          <FilterIcon
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': '#99A0AE' }}
          />
          <HeartIcon
            className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
            style={{ '--color-icon': '#99A0AE' }}
          />
        </div>
      </div>

      <div className="lg:mx-4 border-bottom h-[1px]" />

      <div className="flex flex-row gap-3 items-center text-xs overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3 flex-nowrap p-1 lg:px-4">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center align-middle rounded-full border border-solid bg-white hover:bg-[#EFEBFF] border-transparent shadow px-4 py-1  cursor-pointer select-none transition-all duration-300',
                filters.type === 'All' ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : ''
              )}
              {...draggableLink}
              onClick={e => {
                const result = draggableLink.onClick(e)

                if (!result) return

                filters.setType('All')
              }}
            >
              All
            </div>
            <Separator orientation="vertical" className="h-6" />

            {['Keynote', 'Talk', 'Workshop', 'Panel', 'Lightning', 'CLS'].map(type => (
              <div
                key={type}
                className={cn(
                  'flex shrink-0 items-center justify-center align-middle rounded-full border bg-white hover:bg-[#EFEBFF] border-solid border-transparent shadow px-4 py-1 cursor-pointer select-none transition-all duration-300',
                  filters.type === type ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : ''
                )}
                onClick={() => filters.setType(type)}
              >
                {type}
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <div className="lg:mx-4 mb-4 border-bottom h-[1px]" />
    </div>
  )
}

const SPEAKERS_PER_PAGE = 30

export const SpeakerList = ({ speakers }: { speakers: SpeakerType[] | null }) => {
  const [selectedSpeaker, setSelectedSpeaker] = useRecoilState(selectedSpeakerAtom)
  const { filteredSpeakers, filters } = useSpeakerFilter(speakers)
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const draggableLink = useDraggableLink()
  const pathname = usePathname()

  console.log(speakers?.slice(0, 10))

  const [isSticky, setIsSticky] = useState(false)
  const stickyRef = useRef<HTMLDivElement>(null)
  const [visibleSpeakers, setVisibleSpeakers] = useState<SpeakerType[]>([])
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
  }, [filteredSpeakers])

  useEffect(() => {
    setVisibleSpeakers(filteredSpeakers.slice(0, page * SPEAKERS_PER_PAGE))
  }, [page, filteredSpeakers])

  return (
    <div data-type="speaker-list" className={cn(cardClass)}>
      <SpeakerFilter filters={filters} />

      <div className="flex flex-col gap-3 pb-4 lg:px-4 font-semibold">Featured Speakers</div>

      <div className="overflow-hidden">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3">
            {visibleSpeakers.slice(0, 10).map((speaker, index) => (
              <div
                key={speaker.id}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 shrink-0 cursor-pointer hover:border-[#ac9fdf] transition-all duration-300',
                  selectedSpeaker?.id === speaker.id ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
                  index === 0 ? 'lg:ml-4' : ''
                )}
                {...draggableLink}
                onClick={e => {
                  const result = draggableLink.onClick(e)

                  if (!result) return

                  if (selectedSpeaker?.id === speaker.id && pathname === '/speakers') {
                    setSelectedSpeaker(null)
                  } else {
                    setSelectedSpeaker(speaker)
                  }
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
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <div data-type="speaker-prompts" className="flex gap-3 my-4 border-bottom lg:mx-4 pb-4">
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible('Help me decide which keynotes to attend speaking about')}
        >
          <div className="truncate">Help me decide which keynotes to attend speaking about</div>
        </StandalonePrompt>
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible('Help me find a speaker that is similar to')}
        >
          <div className="truncate">Help me find a speaker that is similar to</div>
        </StandalonePrompt>
      </div>

      <div className="flex flex-col gap-3 lg:px-4 font-semibold">Speakers</div>

      <div
        className={cn('sticky top-[55px] lg:top-[56px] z-[10] overflow-hidden', isSticky ? css['sticky-glass'] : '')}
        ref={stickyRef}
      >
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row flex-nowrap gap-3 lg:p-4 py-3 w-full">
            {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((letter, index, array) => (
              <div
                key={letter}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full bg-white border border-solid border-[#E1E4EA] w-[26px] h-[26px] text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300',
                  letter === filters.selectedLetter ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : '',
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
                    filters.setSelectedLetter(filters.selectedLetter === letter ? '' : letter)
                  }, 100)
                }}
              >
                {letter}
              </div>
            ))}
          </div>
        </SwipeToScroll>
      </div>

      <motion.div className="flex flex-col gap-3 mb-4 lg:px-4">
        {visibleSpeakers.map((speaker, index) => {
          return (
            <motion.div
              key={speaker.id}
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

export const SpeakerView = ({ speaker, standalone }: { speaker: SpeakerType | null; standalone?: boolean }) => {
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const { toast } = useToast()

  if (!speaker) return null

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/speakers/${speaker.id}`
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast({
          title: 'Speaker link copied to clipboard!',
          duration: 3000,
        })
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
        toast({
          title: 'Failed to copy link',
          description: 'Please try again',
          duration: 3000,
        })
      })
  }

  return (
    <div
      data-type="speaker-view"
      className={cn(
        cardClass,
        'flex flex-col gap-3 lg:p-4 self-start w-full no-scrollbar',
        !standalone && 'lg:max-h-[calc(100vh-72px)] lg:overflow-auto'
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
            speaker.avatar?.startsWith('data') ? 'object-contain object-center' : 'object-cover'
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
              className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
              style={{ '--color-icon': 'white' }}
            />

            <Link className="flex justify-center items-center" to={`/speakers/${speaker.id}`}>
              <ShareIcon
                className="icon cursor-pointer hover:scale-110 transition-transform duration-300"
                style={{ '--color-icon': 'white' }}
                // onClick={copyShareLink}
              />
            </Link>

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

      <div className="border-top border-bottom py-4 shrink-0">
        <StandalonePrompt
          className="w-full"
          onClick={() => setDevaBotVisible(`Tell me what I should ask ${speaker?.name} about`)}
        >
          <div className="truncate">Tell me what I should ask {speaker?.name} about</div>
        </StandalonePrompt>
      </div>

      <div className="flex flex-col gap-3 font-semibold shrink-0">Sessions</div>

      <div className="flex flex-col gap-3 shrink-0">
        {speaker?.sessions?.map(session => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}

export const SpeakerLayout = ({ speakers }: { speakers: SpeakerType[] | null }) => {
  const [_, setSelectedSpeaker] = useRecoilState(selectedSpeakerAtom)
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

      <div className="block lg:hidden">
        <Popup open={!!selectedSpeaker} setOpen={() => setSelectedSpeaker(null)}>
          <div
            className={cn(
              'basis-[100%] lg:basis-[40%] lg:min-w-[393px] max-w-[100%] lg:sticky lg:top-[72px] lg:self-start'
            )}
          >
            <SpeakerView speaker={selectedSpeaker} />
          </div>
        </Popup>
      </div>

      {selectedSpeaker && (
        <div className={cn('basis-[40%] min-w-[393px] max-w-[100%] sticky top-[72px] self-start hidden lg:block')}>
          <SpeakerView speaker={selectedSpeaker} />
        </div>
      )}
    </div>
  )
}
