import React, { useMemo, useState } from 'react'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import { Session as SessionType } from 'types/Session'
import { Link } from 'components/common/link'
import { SessionCard } from '.'
import { useQuery } from '@tanstack/react-query'
import { useAccountContext } from 'context/account-context'
import { APP_CONFIG } from 'utils/config'
import { Separator } from 'lib/components/ui/separator'
import cn from 'classnames'
import { FancyLoader } from 'lib/components/loader/loader'

interface Props {
  sessions: SessionType[]
  standalone?: boolean
}

export function PersonalizedSuggestions({ sessions, standalone }: Props) {
  const { account } = useAccountContext()
  const [filter, setFilter] = useState<'featured' | 'personal' | 'recommended'>('featured')

  const featured = useMemo(
    () => sessions.filter(s => s.featured).sort((a: SessionType, b: SessionType) => a.slot_start - b.slot_start),
    [sessions]
  )
  const personal = useMemo(
    () =>
      sessions
        .filter(
          s => account?.attending_sessions.includes(s.sourceId) || account?.interested_sessions.includes(s.sourceId)
        )
        .sort((a: SessionType, b: SessionType) => a.slot_start - b.slot_start),
    [sessions, account]
  )

  const { data: recommended, isLoading } = useQuery({
    queryKey: ['account', 'sessions', 'recommended', account?.id],
    queryFn: async () => {
      if (!account?.id) {
        console.log('Not logged in... No recommendations')
        return []
      }

      try {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/sessions/recommended`, {
          method: 'GET',
          credentials: 'include',
        })

        const { data } = await response.json()
        return data.sort((a: SessionType, b: SessionType) => a.slot_start - b.slot_start)
      } catch (error) {
        console.error('Error fetching recommended sessions', error)
        return []
      }
    },
  })

  const sessionList = useMemo(() => {
    if (filter === 'featured') return featured
    if (filter === 'personal') return personal
    if (filter === 'recommended') return recommended
    return []
  }, [filter, featured, personal, recommended])

  return (
    <>
      <div className="flex justify-between gap-3 pb-4 px-4 font-semibold">
        Schedule Highlights{' '}
        {standalone && (
          <Link
            to="/schedule"
            className="shrink-0 select-none cursor-pointer mr-2 rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300"
          >
            <p>Go to Schedule</p>
          </Link>
        )}
      </div>

      {standalone && (
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3 flex-nowrap p-1 px-4 text-xs items-center">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center align-middle rounded-full border bg-white border-solid border-transparent shadow px-4 py-1 select-none transition-all duration-300',
                filter === 'featured' ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : ''
              )}
              onClick={() => setFilter('featured')}
            >
              Featured
            </div>

            <Separator orientation="vertical" className="h-6" />

            {[
              {
                name: 'Personal',
                list: personal,
              },
              {
                name: 'Recommended',
                list: recommended,
              },
            ].map(({ name }) => {
              return (
                <div
                  key={name}
                  className={cn(
                    'flex shrink-0 items-center justify-center align-middle rounded-full border bg-white border-solid border-transparent shadow px-4 py-1 select-none transition-all duration-300',
                    filter === name.toLowerCase() ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : ''
                  )}
                  onClick={() => {
                    setFilter(name.toLowerCase() as 'featured' | 'personal' | 'recommended')
                  }}
                >
                  {name}
                </div>
              )
            })}
          </div>
        </SwipeToScroll>
      )}

      <div className={cn('overflow-hidden mb-3', standalone ? 'my-4' : '')}>
        {filter === 'personal' && !sessionList?.length && (
          <div className="ml-4 text-xs text-[#717784]">
            <p>
              <Link to="/account/profile" className="underline text-[#7d52f4]">
                Complete your profile
              </Link>{' '}
              to see personalized recommendations.
            </p>
          </div>
        )}
        {filter === 'recommended' && isLoading && (
          <div className="ml-4 flex items-center justify-center w-full">
            <FancyLoader loading={isLoading} size={60} />
          </div>
        )}
        {filter === 'recommended' && !isLoading && !sessionList?.length && (
          <div className="ml-4 text-xs text-[#717784]">
            <p>
              <Link to="/account/profile" className="underline text-[#7d52f4]">
                Complete your profile
              </Link>{' '}
              to see personalized recommendations.
            </p>
          </div>
        )}
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3">
            {sessionList?.map((session: SessionType, index: number) => (
              <SessionCard
                session={session}
                key={session.sourceId}
                className={cn('w-[360px] max-w-[360px] shrink-0', index === 0 ? 'ml-4' : '')}
              />
            ))}
          </div>
        </SwipeToScroll>
      </div>
    </>
  )
}
