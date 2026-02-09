import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import HeroBackground from 'components/common/dc-8/hero/images/dc8-bg.png'

const DEVCON_AI_URL = process.env.NEXT_PUBLIC_DEVCON_AI_URL || 'http://localhost:3001'

const TICKET_TYPE = 'Builder'

const OPTIONS = {
  style: ['Cyberpunk', 'Watercolor', 'Pixel Art', 'Art Nouveau', 'Minimalist', 'Ukiyo-e'],
  vibe: ['Chill', 'Chaotic', 'Mystical', 'Optimistic', 'Rebellious', 'Zen'],
  spirit: ['Phoenix', 'Elephant', 'Octopus', 'Wolf', 'Owl', 'Dragon'],
}

type Category = keyof typeof OPTIONS

function ChoiceGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: string[]
  selected: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="text-white/50 text-xs uppercase tracking-widest">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 border ${
              selected === option
                ? 'bg-[rgba(77,89,199,0.8)] border-white/40 text-white'
                : 'bg-black/40 border-white/40 text-white backdrop-blur-sm hover:bg-black/50 hover:border-white/60'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const ticketId = router.query.ticketId as string

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingExisting, setFetchingExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(true)
  const [choices, setChoices] = useState({
    style: OPTIONS.style[0],
    vibe: OPTIONS.vibe[0],
    spirit: OPTIONS.spirit[0],
  })

  // Fetch existing avatar on load
  useEffect(() => {
    if (!ticketId) return

    const fetchAvatar = async () => {
      try {
        const res = await fetch(`${DEVCON_AI_URL}/api/generate-image/${ticketId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.avatar) {
            setAvatarUrl(data.avatar)
            setShowForm(false)
          }
        }
      } catch {
        // No existing avatar, that's fine
      } finally {
        setFetchingExisting(false)
      }
    }

    fetchAvatar()
  }, [ticketId])

  const handleGenerate = async () => {
    if (!ticketId) return
    setLoading(true)
    setError(null)
    setShowForm(false)

    try {
      const res = await fetch(`${DEVCON_AI_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          ...choices,
          ticketType: TICKET_TYPE,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      setAvatarUrl(`${data.image}?t=${Date.now()}`)
    } catch (err: any) {
      setError(err.message)
      setShowForm(true)
    } finally {
      setLoading(false)
    }
  }

  const hasAvatar = !!avatarUrl && !loading
  const formVisible = showForm && !loading && !fetchingExisting

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#0E122F] py-16">
      <Image
        src={HeroBackground}
        alt="Background"
        fill
        placeholder="blur"
        className="object-cover pointer-events-none opacity-30"
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-4">
        <div
          className="flex flex-col items-center gap-2"
          style={{
            transform: hasAvatar && !showForm ? 'translateY(-2rem)' : 'translateY(0)',
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">
            {TICKET_TYPE} Ticket
          </span>
          {ticketId && <span className="text-white/30 text-xs font-mono">{ticketId}</span>}
        </div>

        <div
          className="w-64 h-64 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0"
          style={
            {
              border: '3px solid transparent',
              backgroundClip: 'padding-box',
              boxShadow:
                '0 0 30px rgba(77, 89, 199, 0.4), 0 0 60px rgba(77, 89, 199, 0.15), inset 0 0 30px rgba(77, 89, 199, 0.1)',
              backgroundImage:
                'linear-gradient(#0E122F, #0E122F), linear-gradient(135deg, rgba(77,89,199,0.8), rgba(254,122,6,0.6), rgba(77,89,199,0.8))',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              transform: hasAvatar && !showForm ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
            } as React.CSSProperties
          }
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-white/10 border-t-[rgba(77,89,199,0.8)] rounded-full animate-spin" />
              <span className="text-white/40 text-xs">Generating...</span>
            </div>
          ) : fetchingExisting ? (
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Generated avatar"
              className="w-full h-full object-cover cursor-pointer hover:brightness-75 transition-all duration-300"
              onClick={() => setShowForm(prev => !prev)}
              title="Click to edit"
            />
          ) : (
            <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </div>

        <div
          className="flex flex-col gap-5 w-full overflow-hidden"
          style={{
            maxHeight: formVisible ? '500px' : '0px',
            opacity: formVisible ? 1 : 0,
            transition: 'max-height 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease',
          }}
        >
          {(Object.keys(OPTIONS) as Category[]).map(category => (
            <ChoiceGroup
              key={category}
              label={category}
              options={OPTIONS[category]}
              selected={choices[category]}
              onSelect={value => setChoices(prev => ({ ...prev, [category]: value }))}
            />
          ))}
        </div>

        {formVisible && (
          <button
            onClick={handleGenerate}
            disabled={!ticketId}
            className="px-8 py-3 bg-[rgba(77,89,199,1)] hover:bg-[#555EB1] transition-colors duration-300 rounded-full border border-white/30 text-white font-semibold backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Avatar
          </button>
        )}

        {hasAvatar && !showForm && (
          <div className="flex flex-col items-center gap-5">
            <p className="text-white/70 text-sm text-center">
              Join us on the Road to Devcon — share your avatar
            </p>

            <div className="flex gap-3">
              <a
                href="#"
                onClick={e => e.preventDefault()}
                className="flex items-center gap-2 px-5 py-2.5 bg-black/50 hover:bg-black/70 border border-white/20 rounded-full text-white text-sm font-medium backdrop-blur-sm transition-colors duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </a>
              <a
                href="#"
                onClick={e => e.preventDefault()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#8A63D2]/30 hover:bg-[#8A63D2]/50 border border-[#8A63D2]/40 rounded-full text-white text-sm font-medium backdrop-blur-sm transition-colors duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                Share on Farcaster
              </a>
            </div>

          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  )
}
