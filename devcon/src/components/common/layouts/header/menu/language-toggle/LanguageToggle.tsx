import React from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { Globe, ChevronDown } from 'lucide-react'
import useIsTouchDevice from 'hooks/useIsTouchDevice'
import css from './language-toggle.module.scss'

const LOCALES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'HI' },
  { code: 'mr', label: 'मराठी', short: 'MR' },
] as const

type LocaleCode = (typeof LOCALES)[number]['code']

// Matches the .menu-closing transition duration and the nav foldout close
// grace period (FOLDOUT_CLOSE_MS in Navigation.tsx)
const CLOSE_MS = 150

export function LanguageToggle() {
  const router = useRouter()
  const isTouchDevice = useIsTouchDevice()
  // Target state; drives the closing transition while the menu stays mounted
  const [open, setOpen] = React.useState(false)
  // Keeps the menu mounted until the close transition finishes
  const [rendered, setRendered] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setOpen(true)
    setRendered(true)
  }

  // Re-opening mid-close retargets the transition instead of restarting it
  const closeMenu = () => {
    setOpen(false)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setRendered(false)
      closeTimerRef.current = null
    }, CLOSE_MS)
  }

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const currentCode: LocaleCode =
    router.locale === 'hi' ? 'hi' : router.locale === 'mr' ? 'mr' : 'en'
  const current = LOCALES.find(l => l.code === currentCode) ?? LOCALES[0]

  React.useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      id="language-toggle"
      ref={ref}
      className="relative self-stretch flex items-center text-sm font-bold ml-3"
      // Touch fires synthetic mouseenter on tap and clears hover right after
      // (mouseleave), which would open-then-close the menu — hover is
      // pointer-only, touch uses the click toggle below
      onMouseEnter={isTouchDevice ? undefined : openMenu}
      onMouseLeave={isTouchDevice ? undefined : closeMenu}
    >
      <button
        type="button"
        // Pointer: hover has already opened it, so click just re-opens
        // (a toggle would close what the hover opened). Touch: tap toggles.
        onClick={() => (isTouchDevice && open ? closeMenu() : openMenu())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Select language"
        className="flex items-center gap-1 px-2 py-1 hover:opacity-70 transition-opacity"
      >
        <Globe size={16} />
        <span>{current.short}</span>
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {rendered && (
        // The 8px padding-top is the hover bridge across the visual gap
        // between the nav bar and the card, same as the nav foldouts
        <div className="absolute right-0 top-full pt-2 z-50">
          <div
            role="menu"
            className={`${css['menu-card']} ${!open ? css['menu-closing'] : ''} min-w-[140px] bg-white shadow-lg rounded-md border border-gray-200 overflow-hidden`}
          >
            {LOCALES.map(l => {
              const isActive = l.code === currentCode
              return (
                <NextLink
                  key={l.code}
                  href={router.asPath}
                  locale={l.code}
                  role="menuitem"
                  onClick={closeMenu}
                  className={`block px-3 py-2 text-sm text-gray-900 hover:bg-[#E5D9FC] ${isActive ? 'font-bold bg-[#E5D9FC]' : 'font-normal'}`}
                >
                  {l.label}
                </NextLink>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
