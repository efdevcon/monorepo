import React from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { Globe, ChevronDown } from 'lucide-react'

const LOCALES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'HI' },
] as const

type LocaleCode = (typeof LOCALES)[number]['code']

export function LanguageToggle() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const currentCode: LocaleCode = (router.locale === 'hi' ? 'hi' : 'en')
  const current = LOCALES.find(l => l.code === currentCode) ?? LOCALES[0]

  React.useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div id="language-toggle" ref={ref} className="relative text-sm font-bold ml-3">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
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
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[140px] bg-white shadow-lg rounded-md border border-gray-200 z-50 overflow-hidden"
        >
          {LOCALES.map(l => {
            const isActive = l.code === currentCode
            return (
              <NextLink
                key={l.code}
                href={router.asPath}
                locale={l.code}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 ${isActive ? 'font-bold bg-gray-50' : 'font-normal'}`}
              >
                {l.label}
              </NextLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
