import React, { useState } from 'react'
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
import { useRecoilState } from 'recoil'
import { devaBotVisibleAtom } from 'pages/_app'

const cardClass = 'flex flex-col border border-solid border-[#E4E6EB] rounded-3xl overflow-hidden'

const useSpeakerFilter = (speakers: SpeakerType[] | null) => {
  const [text, setText] = useState('')
  const [type, setType] = useState('All')

  if (!speakers) return { filteredSpeakers: [], filters: { text, setText, type, setType } }

  return {
    filteredSpeakers: speakers.filter(speaker => speaker.name.includes(text)),
    filters: {
      text,
      setText,
      type,
      setType,
    },
  }
}

export const SpeakerFilter = ({
  filters,
}: {
  filters: { text: string; setText: (text: string) => void; type: string; setType: (type: string) => void }
}) => {
  return (
    <div data-type="speaker-filter" className="flex flex-col gap-3 p-4">
      <div className="flex flex-row gap-3 justify-between w-full">
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

      <div className="flex flex-row gap-3 items-center text-xs border-top border-bottom py-4">
        <SwipeToScroll>
          <div className="flex flex-row gap-3 flex-nowrap">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center align-middle rounded-full border border-solid bg-white hover:bg-[#EFEBFF] border-transparent shadow px-4 py-1  cursor-pointer select-none transition-all duration-300',
                filters.type === 'All' ? ' border-[#ac9fdf] !bg-[#EFEBFF]' : ''
              )}
              onClick={() => filters.setType('All')}
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
    </div>
  )
}

export const SpeakerList = ({ speakers }: { speakers: SpeakerType[] | null }) => {
  const { filteredSpeakers, filters } = useSpeakerFilter(speakers)
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)

  console.log(speakers?.slice(0, 10))

  return (
    <div data-type="speaker-list" className={cn(cardClass)}>
      <SpeakerFilter filters={filters} />

      <div className="flex flex-col gap-3 pb-4 px-4 font-semibold">Featured Speakers</div>

      <SwipeToScroll>
        <div className="flex flex-row gap-3">
          {filteredSpeakers.slice(0, 10).map((speaker, index) => (
            <div
              key={speaker.id}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 shrink-0',
                index === 0 ? 'ml-4' : ''
              )}
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

      <div data-type="speaker-prompts" className="flex gap-3 m-4 border-bottom mx-4 pb-4">
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

      <div className="flex flex-col gap-3 p-4">All Speakers</div>

      {filteredSpeakers.map(speaker => (
        <div key={speaker.id}>{speaker.name}</div>
      ))}
    </div>
  )
}

export const SpeakerView = ({ speakers }: { speakers: SpeakerType[] | null }) => {
  return (
    <div data-type="speaker-view" className={cardClass}>
      Speaker View
    </div>
  )
}

export const SpeakerLayout = ({ speakers }: { speakers: SpeakerType[] | null }) => {
  if (!speakers) return null

  return (
    <div data-type="speaker-layout" className="flex flex-row gap-3 w-full max-w-full relative overflow-hidden">
      <div className="basis-[60%] grow">
        <SpeakerList speakers={speakers} />
      </div>
      <div className="basis-[40%] bg-yellow-500 min-w-[393px]">
        <SpeakerView speakers={speakers} />
      </div>
    </div>
  )
}
