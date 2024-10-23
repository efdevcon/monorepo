import React from 'react'
import { Session as SessionType } from 'types/Session'
import moment from 'moment'
import { useAccountContext } from 'context/account-context'
import { useAppContext } from 'context/app-context'
import CalendarIcon from 'assets/icons/favorite.svg'

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
  const speakerNames = speakers.map(speaker => speaker.name).join(', ')
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

  console.log(start, end, 'startTimeAsMoment')

  let trackLogo

  if (track === 'Core Protocol') {
    trackLogo = CoreProtocol
  }
  if (track === 'Cypherpunk') {
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

  console.log(trackLogo, 'trackLogo')

  console.log(track, 'trackLogo')

  //   console.log(id, 'id hello')

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex">
        <div className="basis-[100px] shrink-0 bg-purple-200 flex items-center justify-center">
          {trackLogo && <Image src={trackLogo} alt={track} className="w-full h-full object-contain p-2" />}
        </div>
        <div className="flex flex-col grow p-2">
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
              <IconClock />
              <p className="text-xs text-gray-600">
                {(() => {
                  const startTime = start
                  const endTime = end

                  return `${startTime.format('MMM Do')} — ${startTime.format('HH:mm A')} - ${endTime.format('HH:mm A')}`
                })()}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <IconSpeaker />
              <p className="text-xs text-gray-600 truncate">{speakerNames}</p>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex  justify-center p-3 cursor-pointer">
          <CalendarIcon className="icon" style={{ '--color-icon': '#99A0AE' }} />
          {/* <p className="text-sm font-semibold text-gray-800 truncate">{date}</p> */}
        </div>
      </div>
    </div>
  )
}

export const Sessions = () => {
  return <div>Sessions</div>
}
