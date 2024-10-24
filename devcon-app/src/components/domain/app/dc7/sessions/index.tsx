import React from 'react'
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
import ShareIcon from 'assets/icons/arrow-curved.svg'
import { useRouter } from 'next/router'
import { Toaster } from 'lib/components/ui/toaster'
import { motion } from 'framer-motion'
import { useToast } from 'lib/hooks/use-toast'

const cardClass = 'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative'

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
              'absolute top-0 w-full text-xs text-white font-semibold p-2 z-10 h-[52px] line-clamp-3 break-words',
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

export const SessionList = ({ sessions }: { sessions: SessionType[] | null }) => {
  return <div>SessionList</div>
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
