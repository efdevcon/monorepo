import React, { useMemo, useState } from 'react'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import { Speaker as SpeakerType } from 'types/Speaker'
import { Session as SessionType } from 'types/Session'
import { Link } from 'components/common/link'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useAccountContext } from 'context/account-context'
import { APP_CONFIG } from 'utils/config'
import { Separator } from 'lib/components/ui/separator'
import cn from 'classnames'
import moment from 'moment'
import { useDraggableLink } from 'lib/hooks/useDraggableLink'
import css from './speakers.module.scss'
import { FancyLoader } from 'lib/components/loader/loader'

interface Props {
  speakers: SpeakerType[]
  selectedSpeaker?: SpeakerType | null
  standalone?: boolean
  onSpeakerSelect?: (e: any, speaker: SpeakerType) => void
}

export function RecommendedSpeakers({ speakers, selectedSpeaker, standalone, onSpeakerSelect }: Props) {
  const { account } = useAccountContext()
  const [filter, setFilter] = useState<'featured' | 'social'>('featured')
  const draggableLink = useDraggableLink()

  const featuredSpeakers = useMemo(
    () =>
      speakers
        ?.filter(speaker =>
          speaker.sessions?.some(session => session.featured && moment.utc(session.slot_start).isAfter(moment.utc()))
        )
        .sort(() => Math.random() - 0.5),
    [speakers]
  )

  const { data: recommended, isLoading } = useQuery({
    queryKey: ['account', 'speakers', 'recommended', account?.id],
    queryFn: async () => {
      if (!account?.id) {
        console.log('Not logged in... No recommendations')
        return []
      }

      try {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/account/speakers/recommended`, {
          method: 'GET',
          credentials: 'include',
        })

        const { data } = await response.json()
        return data.sort(() => Math.random() - 0.5)
      } catch (error) {
        console.error('Error fetching recommended speakers', error)
        return []
      }
    },
  })

  const speakerList = useMemo(() => {
    if (filter === 'featured') return featuredSpeakers
    if (filter === 'social') return recommended
    return []
  }, [filter, featuredSpeakers, recommended])

  return (
    <>
      <div className="flex justify-between gap-3 pb-4 px-4 font-semibold">
        Speaker Highlights{' '}
        {standalone && (
          <Link
            to="/speakers"
            className="shrink-0 select-none cursor-pointer mr-2 rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300"
          >
            <p>Go to Speakers</p>
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
                id: 'social',
                name: 'Onchain Social',
              },
            ].map(({ id, name }) => {
              return (
                <div
                  key={name}
                  className={cn(
                    'flex shrink-0 items-center justify-center align-middle rounded-full border bg-white border-solid border-transparent shadow px-4 py-1 select-none transition-all duration-300',
                    filter === id.toLowerCase() ? 'border-[#ac9fdf] !bg-[#EFEBFF]' : ''
                  )}
                  onClick={() => {
                    setFilter(id.toLowerCase() as 'featured' | 'social')
                  }}
                >
                  {name}
                </div>
              )
            })}

            <div className="shrink-0 w-[16px]"></div>
          </div>
        </SwipeToScroll>
      )}

      <div className={cn('overflow-hidden mb-3', standalone ? 'my-4' : '')}>
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          <div className="flex flex-row gap-3">
            {filter === 'social' && isLoading && (
              <div className="ml-4 flex items-center justify-center w-full">
                <FancyLoader loading={isLoading} size={60} />
              </div>
            )}
            {filter === 'social' && !isLoading && !speakerList?.length && (
              <div className="ml-4 text-xs text-[#717784]">
                <p>
                  <Link to="/account/wallets" className="underline text-[#7d52f4]">
                    Connect your wallet
                  </Link>{' '}
                  to include your onchain social graph. Your social connections are based on{' '}
                  <Link to="https://farcaster.xyz" target="_blank" className="underline text-[#7d52f4]">
                    Farcaster
                  </Link>
                  ,{' '}
                  <Link to="https://lens.xyz" target="_blank" className="underline text-[#7d52f4]">
                    Lens
                  </Link>{' '}
                  and{' '}
                  <Link to="https://ethfollow.xyz" target="_blank" className="underline text-[#7d52f4]">
                    Ethereum Follow Protocol
                  </Link>
                  .
                </p>
              </div>
            )}
            {speakerList?.map((speaker: SpeakerType, index: number) => (
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
                  onSpeakerSelect?.(e, speaker)
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
            <div className="shrink-0 w-[16px]"></div>
          </div>
        </SwipeToScroll>
      </div>
    </>
  )
}
