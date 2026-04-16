import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from 'lib/components/ui/dialog'
import { X } from 'lucide-react'
import ReminderBg from './images/new/reminder-bg.png'

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

const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center justify-center text-center">
    <p className="text-2xl font-extrabold text-white leading-[28.8px] tracking-[-0.5px]">{value}</p>
    <p className="text-sm text-[#dddae2] leading-5">{label}</p>
  </div>
)

const Separator = () => <div className="w-px h-4 bg-white/30" aria-hidden />

export type GetReminderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const GetReminderDialog = ({ open, onOpenChange }: GetReminderDialogProps) => {
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, mins: 0, secs: 0 })
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!open) return
    setMounted(true)
    setCountdown(computeCountdown())
    const interval = setInterval(() => setCountdown(computeCountdown()), 1000)
    return () => clearInterval(interval)
  }, [open])

  useEffect(() => {
    if (!open) {
      setStatus('idle')
      setErrorMsg('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          // Reset default Dialog positioning
          '!p-0 !gap-0 !border-0 !bg-transparent !shadow-none !max-w-none',
          // Mobile: bottom sheet, full width
          '!top-auto !left-0 !translate-x-0 !translate-y-0 !bottom-0 !w-full',
          // Desktop: centered modal, constrained width
          'sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!bottom-auto sm:!max-w-[640px] sm:!w-[calc(100%-32px)]',
          // Animations
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          // Mobile: slide up from bottom
          'data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
          // Desktop: zero out slide and use zoom instead
          'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0',
          'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          'data-[state=open]:duration-500 data-[state=closed]:duration-300',
          'data-[state=open]:ease-out data-[state=closed]:ease-in',
        ].join(' ')}
      >
        <div
          className={[
            'relative overflow-hidden border border-solid border-[#ffa366] flex flex-col items-center justify-center',
            // Mobile styling: top-only rounded, shadow above, compact padding
            'rounded-t-2xl rounded-b-none pt-6 pb-8 px-4 gap-6',
            'shadow-[0_-20px_25px_-5px_rgba(22,11,43,0.1),0_-8px_10px_-6px_rgba(22,11,43,0.1)]',
            // Desktop overrides
            'sm:rounded-2xl sm:p-8 sm:gap-6',
            'sm:shadow-[0_20px_25px_-5px_rgba(22,11,43,0.1),0_8px_10px_-6px_rgba(22,11,43,0.1)]',
          ].join(' ')}
        >
          {/* Background image */}
          <div aria-hidden className="absolute inset-0 pointer-events-none bg-[#1a0d33]">
            <Image src={ReminderBg} alt="" fill className="object-cover" placeholder="blur" />
            {/* Radial dark gradient overlay (darker at the bottom) */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 130% 100% at 50% 0%, rgba(34,17,68,0) 0%, rgba(34,17,68,1) 100%)',
              }}
            />
          </div>

          {/* Content wrapper */}
          <div className="relative flex flex-col gap-8 items-center justify-center w-full">
            {/* Header */}
            <div className="flex items-center justify-between relative w-full">
              <p className="text-xl font-bold text-[#f9f8fa] leading-[28.8px] tracking-[-0.5px] whitespace-nowrap [text-shadow:0px_1px_2px_rgba(34,17,68,0.2)]">
                Get Devcon ticket reminders
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="absolute -right-2 -top-2 size-5 flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity sm:-right-2 sm:-top-2"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Countdown section */}
            <div className="flex flex-col gap-4 items-center w-full">
              <p className="text-sm font-semibold text-[#ffa366] text-center tracking-[2px] leading-none [text-shadow:0px_1px_2px_rgba(34,17,68,0.2)]">
                TICKETS LAUNCH MAY 12
              </p>
              <div className="flex flex-col gap-4 items-center w-full">
                <div className="flex gap-6 items-center justify-center w-full [filter:drop-shadow(0_1px_4px_rgba(0,0,0,0.3))]">
                  {mounted && (
                    <>
                      <CountdownUnit value={countdown.days} label="days" />
                      <Separator />
                      <CountdownUnit value={countdown.hours} label="hours" />
                      <Separator />
                      <CountdownUnit value={countdown.mins} label="mins" />
                      <Separator />
                      <CountdownUnit value={countdown.secs} label="secs" />
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between font-extrabold w-full whitespace-nowrap">
                  <p className="text-base text-[#f9f8fa] leading-4">Global Early Bird</p>
                  <div className="flex gap-1 items-end">
                    {/* <p className="text-sm text-[#aca6b9] line-through leading-[14px]">$699</p>
                    <p className="text-base text-[#f9f8fa] leading-4">$349</p> */}
                    <p className="text-sm text-[#aca6b9] leading-4">Discounted</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input + CTA */}
            <div className="flex flex-col gap-3 w-full">
              {status === 'success' ? (
                <div className="backdrop-blur-[3px] bg-[rgba(0,119,30,0.5)] rounded-lg p-3 w-full text-center text-[14px] text-[#f9f8fa] leading-5">
                  <p className="font-bold">You&rsquo;re on the list!</p>
                  <p>We&rsquo;ll remind you before May 12 – don&rsquo;t miss Early Bird pricing ❤️</p>
                </div>
              ) : (
                <>
                  {/* Input + button: stacked on mobile, inline on desktop */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      disabled={status === 'loading'}
                      className="bg-white border border-[#dddae2] rounded-lg h-10 leading-10 px-4 text-[14px] text-[#160b2b] placeholder:text-[#594d73] flex-1 min-w-0 outline-none focus:border-[#7235ed] transition-colors disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={status === 'loading' || !email.trim()}
                      className="bg-[#7235ed] hover:bg-[#6028cc] transition-colors text-[#f9f8fa] font-bold text-[14px] leading-none h-10 px-8 rounded-full sm:rounded-lg whitespace-nowrap cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {status === 'loading' ? 'Subscribing...' : 'Remind me'}
                    </button>
                  </div>
                  {errorMsg && (
                    <p className="text-[#ff6b6b] text-xs text-center">{errorMsg}</p>
                  )}
                  <p className="text-xs text-center leading-4">
                    <span className="text-[#f2f1f4]">By signing up for ticket reminders, you agree to the Ethereum Foundation&rsquo;s </span>
                    <a href="https://ethereum.org/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-[#b08df5] font-bold hover:underline">Privacy Policy</a>
                    <span className="text-[#f2f1f4]">.</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
