import React, { useState } from 'react'
import { Inbox } from 'lucide-react'
import { GetReminderDialog } from './GetReminderDialog'
import { useTranslations } from 'next-intl'

export const EarlyBirdBanner = () => {
  const t = useTranslations('home.early_bird')
  const [reminderOpen, setReminderOpen] = useState(false)

  return (
    <div className="bg-[#ffa366] py-8 sm:py-10 px-5 sm:px-8 md:px-16 flex flex-col items-center justify-center gap-5 sm:gap-6">
      <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b] text-center">
        {t('heading')}
      </h2>
      <button
        type="button"
        onClick={() => setReminderOpen(true)}
        className="bg-[#7235ed] hover:bg-[#6028cc] transition-colors text-white font-bold text-sm sm:text-base rounded-full px-6 sm:px-8 py-3.5 sm:py-4 flex items-center gap-2 justify-center min-h-9 cursor-pointer"
      >
        {t('reminder_button')}
        <Inbox className="w-4 h-4" strokeWidth={2.5} />
      </button>

      <GetReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} />
    </div>
  )
}
