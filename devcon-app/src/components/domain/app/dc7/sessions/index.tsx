import React from 'react'
import { Session as SessionType } from 'types/Session'
import moment from 'moment'

export const SessionCard = ({
  title,
  speakers,
  track,
  date,
  startTimeAsMoment,
  endTimeAsMoment,
  image,
}: SessionType) => {
  const formatTime = (time: moment.Moment | undefined) => time?.format('HH:mm')
  const speakerNames = speakers.map(speaker => speaker.name).join(', ')

  return (
    <div className="flex bg-white rounded-lg shadow-md overflow-hidden">
      <div className="w-1/4 bg-purple-200 flex items-center justify-center">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-purple-600 text-4xl">🔗</div>
        )}
      </div>
      <div className="w-3/4 p-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{track}</p>
        <div className="flex items-center mt-2 text-xs text-gray-500">
          <span className="mr-3">
            <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            {date} {formatTime(startTimeAsMoment)} - {formatTime(endTimeAsMoment)}
          </span>
          <span>
            <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            {speakerNames}
          </span>
        </div>
      </div>
    </div>
  )
}

export const Sessions = () => {
  return <div>Sessions</div>
}
