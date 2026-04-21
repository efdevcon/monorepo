import React, { useState } from 'react'
import MandalaLeft from './images/new/wte-mandala-left.svg'
import MandalaRight from './images/new/wte-mandala-right.svg'
import { CalendarRange, HeartHandshake, BriefcaseBusiness, Blocks, Inbox } from 'lucide-react'
import { GetReminderDialog } from './GetReminderDialog'
import { useTranslations } from 'next-intl'

const icons = [CalendarRange, HeartHandshake, BriefcaseBusiness, Blocks]

export const WhatToExpect = () => {
  const t = useTranslations('home.what_to_expect')
  const cards = t.raw('cards') as Array<{ title: string; intro: string; body: string }>
  const [reminderOpen, setReminderOpen] = useState(false)
  return (
  <div
    className="relative px-5 sm:px-8 md:px-16 py-10 sm:py-[72px] pt-8 sm:pt-[42px] overflow-hidden"
    style={{
      background:
        'radial-gradient(ellipse 60% 55% at 100% 50%, rgba(255,224,204,1) 0%, rgba(255,224,204,0) 100%), ' +
        'radial-gradient(ellipse 60% 55% at 0% 50%, rgba(255,224,204,1) 0%, rgba(255,224,204,0) 100%), ' +
        '#eae6f2',
    }}
  >
    {/* Side mandalas */}
    <MandalaLeft
      aria-hidden
      className="absolute left-0 top-1/2 -translate-y-1/2 scale-[120%] rotate-180 opacity-5 pointer-events-none select-none w-[409px] h-auto"
    />
    <MandalaRight
      aria-hidden
      className="absolute right-0 top-1/2 -translate-y-1/2 scale-[120%] opacity-5 pointer-events-none select-none w-[390px] h-auto"
    />

    <div className="relative flex flex-col items-center gap-6 sm:gap-8">
      <div className="text-center max-w-[778px] flex flex-col gap-3 sm:gap-4">
        <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
          {t('heading')}
        </h2>
        <p className="text-sm sm:text-base text-[#1a0d33] leading-5 sm:leading-6">{t('subheading')}</p>
      </div>

      {/* Cards: 1 col mobile, 2x2 tablet, 4 col desktop */}
      <div className="w-full max-w-[1312px] backdrop-blur-md bg-white/50 border border-[rgba(34,17,68,0.1)] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = icons[i]
          const borders = [
            i > 0 ? 'border-t border-t-[rgba(34,17,68,0.1)]' : '',
            'sm:border-t-0',
            i >= 2 ? 'sm:border-t sm:border-t-[rgba(34,17,68,0.1)]' : '',
            i % 2 === 1 ? 'sm:border-l sm:border-l-[rgba(34,17,68,0.1)]' : '',
            'lg:border-t-0 lg:border-l-0',
            i > 0 ? 'lg:border-l lg:border-l-[rgba(34,17,68,0.1)]' : '',
          ].join(' ')
          return (
            <div key={i} className={`flex flex-col gap-6 items-start pt-6 pb-8 sm:pt-8 sm:pb-12 px-5 ${borders}`}>
              <div className="bg-white/60 rounded-full p-3 flex items-center">
                <Icon className="w-8 h-8 text-[#e87a2a]" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-3 w-full">
                <h3 className="text-xl font-extrabold text-[#160b2b] leading-[26px]">{c.title}</h3>
                <div className="text-sm text-[#221144] leading-5">
                  <p className="font-bold mb-[14px]">{c.intro}</p>
                  <p>{c.body}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reminder CTA */}
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <p className="text-xs sm:text-sm font-semibold text-[#7235ed] text-center tracking-[2px] uppercase">
          {t('tickets_launch_eyebrow')}
        </p>
        <button
          type="button"
          onClick={() => setReminderOpen(true)}
          className="bg-[#7235ed] hover:bg-[#6028cc] transition-colors text-white font-bold text-sm sm:text-base rounded-full px-6 sm:px-8 py-3.5 sm:py-4 flex items-center gap-2 min-h-9 cursor-pointer"
        >
          {t('reminder_button')}
          <Inbox className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>

    <GetReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} />
  </div>
  )
}
