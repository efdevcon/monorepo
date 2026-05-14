import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslations } from 'next-intl'
import { X, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'ai-translation-notice-dismissed'

export const AiTranslationBanner = () => {
  const t = useTranslations('common.ai_translation_notice')
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  const locale = router.locale === 'default' ? 'en' : router.locale ?? 'en'

  useEffect(() => {
    if (locale === 'en') {
      setVisible(false)
      return
    }
    const dismissedLocale = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    setVisible(dismissedLocale !== locale)
  }, [locale])

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale)
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-2rem)] max-w-[420px] bg-white border border-[#221144]/10 rounded-xl shadow-lg p-4 flex items-start gap-3"
    >
      <Sparkles className="w-5 h-5 text-[#7235ed] shrink-0 mt-0.5" strokeWidth={2} />
      <p className="text-sm text-[#1a0d33] leading-5 flex-1">{t('message')}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('dismiss')}
        className="text-[#594d73] hover:text-[#160b2b] shrink-0"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
