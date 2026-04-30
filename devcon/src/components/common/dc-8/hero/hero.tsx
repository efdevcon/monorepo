import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import BannerImage from './images/devcon-8-india-bg.png'
import DevconLogo from './images/devcon-8-india-logo.svg'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconTelegram from 'assets/icons/telegram.svg'
import IconEmail from 'assets/icons/ui-email.svg'
import { Link } from 'components/common/link'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Ticket launch date — May 12, 2026 @ 3:00 PM UTC
const TICKET_LAUNCH_DATE = new Date(Date.UTC(2026, 4, 12, 15, 0, 0))

type Countdown = { days: number; hours: number; mins: number; secs: number }

function computeCountdown(): Countdown {
  const now = Date.now()
  const diff = Math.max(0, TICKET_LAUNCH_DATE.getTime() - now)
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  const secs = Math.floor((diff % 60_000) / 1000)
  return { days, hours, mins, secs }
}

const CountdownUnit = ({ value, label, width }: { value: number; label: string; width?: string }) => (
  <div className={`flex flex-col items-center justify-center text-center ${width || ''}`}>
    <p className="text-2xl font-extrabold text-white leading-[28.8px] tracking-[-0.5px]">{value}</p>
    <p className="text-xs text-[#9188a2] leading-4">{label}</p>
  </div>
)

const Separator = () => <div className="w-px h-4 bg-white/10" aria-hidden />

export const Hero = () => {
  const t = useTranslations('home.hero')
  const tCommon = useTranslations('common')
  const stripHeight = useGetElementHeight('strip')
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, mins: 0, secs: 0 })
  const [formExpanded, setFormExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleHeroSubmit = async () => {
    if (!email.trim()) return
    setFormStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormStatus('error')
        setErrorMsg(data.error || 'Something went wrong')
        return
      }
      setFormStatus('success')
    } catch {
      setFormStatus('error')
      setErrorMsg('Something went wrong')
    }
  }

  useEffect(() => {
    setMounted(true)
    setCountdown(computeCountdown())
    const interval = setInterval(() => setCountdown(computeCountdown()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-[90vh] md:h-screen overflow-hidden">
      {/* Background image */}
      <Image
        src={BannerImage}
        alt={t('bg_alt')}
        fill
        priority
        placeholder="blur"
        className="object-cover object-center"
        style={{ paddingTop: stripHeight }}
      />

      {/* Edge gradients for smooth blending */}
      <div
        className="absolute bottom-0 left-0 w-full h-[150px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(34,17,68,1) 4.5%, rgba(34,17,68,0) 100%)' }}
      />
      <div
        className="absolute top-0 left-0 h-full w-[60px] md:w-[160px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)' }}
      />
      <div
        className="absolute top-0 right-0 h-full w-[60px] md:w-[160px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)' }}
      />

      {/* Hero content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pb-6 md:pb-8 lg:pb-14">
        <div className="section">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 md:items-end md:justify-between">
            {/* Left: Logo + Location */}
            <div className="flex flex-col gap-4 md:gap-6 [filter:drop-shadow(0_2px_12px_#214)]">
              <DevconLogo className="w-[160px] md:w-[263px] h-auto text-white" />
              <div className="flex flex-col gap-1 md:gap-2 text-white">
                <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.2] tracking-[-0.5px]">{t('location')}</h1>
                <p className="text-xl md:text-4xl font-light leading-[1.2] tracking-[-0.5px]">{t('dates')}</p>
              </div>
            </div>

            {/* Right: Ticket countdown + social links */}
            <div className="flex flex-col gap-2 w-full sm:w-[315px] shrink-0">
              {/* Ticket Countdown Widget */}
              <div className="backdrop-blur-[3px] bg-[rgba(26,13,51,0.8)] border border-solid border-[rgba(150,142,166,0.19)] rounded-lg p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-[#ffa366] text-center tracking-[2px] leading-none">
                    {t('tickets_launch_eyebrow')}
                  </p>

                  {/* Countdown row — only render on client to avoid hydration mismatch */}
                  <div className="flex items-center justify-between min-h-[44px]">
                    {mounted && (
                      <>
                        <CountdownUnit value={countdown.days} label={tCommon('countdown.days')} width="w-12" />
                        <Separator />
                        <CountdownUnit value={countdown.hours} label={tCommon('countdown.hours')} />
                        <Separator />
                        <CountdownUnit value={countdown.mins} label={tCommon('countdown.mins')} width="w-10" />
                        <Separator />
                        <CountdownUnit value={countdown.secs} label={tCommon('countdown.secs')} width="w-10" />
                      </>
                    )}
                  </div>

                  {/* Early bird pricing */}
                  <div className="flex items-center justify-between font-extrabold text-sm">
                    <p className="text-white leading-[14px]">{t('early_bird_label')}</p>
                    <div className="flex gap-1 items-end">
                      <p className="text-[#9188a2] line-through leading-[14px]">{t('pricing_full')}</p>
                      <p className="text-white text-base leading-4">{t('pricing_discounted')}</p>
                    </div>
                  </div>
                </div>

                {/* Expandable reminder form */}
                <div
                  className="grid transition-[grid-template-rows] duration-400 ease-in-out"
                  style={{ gridTemplateRows: formExpanded || formStatus === 'success' ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-3">
                      {formStatus === 'success' ? (
                        <div className="bg-[rgba(0,191,48,0.3)] rounded p-3 text-center text-[12px] text-[#f9f8fa] leading-4">
                          <span className="font-bold">{tCommon('reminder_form.success_heading')} </span>
                          <span>{tCommon('reminder_form.success_message')}</span>
                        </div>
                      ) : (
                        <>
                          <input
                            type="email"
                            placeholder={tCommon('reminder_form.email_placeholder')}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleHeroSubmit()}
                            disabled={formStatus === 'loading'}
                            className="bg-transparent border-b border-[rgba(255,255,255,0.1)] text-[14px] text-white placeholder:text-[#aca6b9] py-1.5 leading-5 outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors disabled:opacity-60 w-full"
                          />
                          <button
                            type="button"
                            onClick={handleHeroSubmit}
                            disabled={formStatus === 'loading' || !email.trim()}
                            className="bg-[#7235ed] hover:bg-[#6028cc] transition-colors text-[#f9f8fa] font-bold text-[14px] leading-none rounded-full py-2 w-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[32px]"
                          >
                            {formStatus === 'loading' ? tCommon('reminder_form.submit_loading') : tCommon('reminder_form.submit')}
                          </button>
                          {errorMsg && <p className="text-[#ff6b6b] text-xs text-center">{errorMsg}</p>}
                          <p className="text-[12px] text-center leading-4">
                            <span className="text-[#aca6b9]">{tCommon('reminder_form.privacy_before')}</span>
                            <a href="https://ethereum.org/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-[#9668f1] font-bold hover:underline">{tCommon('reminder_form.privacy_link')}</a>
                            <span className="text-[#aca6b9]">{tCommon('reminder_form.privacy_after')}</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle button — hidden when expanded or success */}
                {!formExpanded && formStatus !== 'success' && (
                  <button
                    type="button"
                    onClick={() => setFormExpanded(true)}
                    className="flex gap-1 items-center justify-center w-full cursor-pointer hover:opacity-80 transition-opacity"
                    aria-label={t('remind_toggle_aria')}
                  >
                    <span className="text-sm font-bold text-[#9668f1] leading-none">{t('remind_toggle')}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#9668f1]" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Social Links */}
              <div className="backdrop-blur-[3px] bg-[rgba(26,13,51,0.8)] border border-solid border-[rgba(150,142,166,0.19)] rounded-lg px-4 py-2 flex items-center justify-center gap-4 sm:justify-between sm:gap-0 [&_path]:!fill-white">
                <p className="text-sm text-white leading-5">{t('follow_for_updates')}</p>
                <div className="flex gap-4 items-center">
                  <Link to="https://x.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                    <IconX className="w-[18px] h-[18px]" />
                  </Link>
                  <Link
                    to="https://instagram.com/efdevcon"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <IconInstagram className="w-[18px] h-[18px]" />
                  </Link>
                  <Link
                    to="https://t.me/+sitvvHw8D8EzN2Yx"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <IconTelegram className="w-[18px] h-[18px]" />
                  </Link>
                  <Link
                    to="https://paragraph.com/@efevents"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <IconEmail className="w-[18px] h-[18px]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
