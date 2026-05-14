import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Inbox } from 'lucide-react'
import { GetReminderDialog } from 'components/domain/landing-page/GetReminderDialog'
import { useTranslations } from 'next-intl'

export const Strip = () => {
  const t = useTranslations('common.strip')
  const router = useRouter()
  const isTickets = router.pathname === '/tickets' || router.pathname.startsWith('/tickets/')
  const [reminderOpen, setReminderOpen] = useState(false)

  if (isTickets) return null

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="bg-[#ffa366] text-[#160b2b] text-xs font-bold leading-4 px-2 py-1 rounded tracking-[1px] uppercase whitespace-nowrap shrink-0">
              {t('badge')}
            </span>
            <p className="text-[#f9f8fa] text-sm font-bold leading-5 whitespace-nowrap overflow-hidden text-ellipsis">
              {t('message')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReminderOpen(true)}
            className="flex gap-1.5 items-center shrink-0 transition-transform hover:scale-[1.02] cursor-pointer"
          >
            <span className="font-bold text-white text-sm">{t('cta')}</span>
            <Inbox className="text-white" size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <GetReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} />
    </div>
  )
}
