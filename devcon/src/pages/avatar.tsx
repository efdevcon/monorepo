import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import HeroBackground from 'components/common/dc-8/hero/images/dc8-bg.png'
import { OtpGate } from 'components/domain/nocodb-form/OtpGate'
import { supabase } from 'services/supabase-browser'
import { SEO } from 'components/domain/seo/SEO'

const AVATAR_REDIRECT_URL = 'https://devcon.org/avatar'
const DEVCON_AI_URL = process.env.NEXT_PUBLIC_DEVCON_AI_URL || 'http://localhost:3001'
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

// Show the dev test-image grid only in non-production builds.
const SHOW_TEST_IMAGES = process.env.NODE_ENV !== 'production'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Stable, deterministic face photos for dev testing. pravatar.cc returns a
// real Unsplash portrait per `img` id (1-70), no API key needed.
const TEST_IMAGES: { id: number; label: string }[] = [
  { id: 1, label: 'F · short hair' },
  { id: 5, label: 'M · glasses' },
  { id: 12, label: 'M · beard' },
  { id: 25, label: 'F · long hair' },
  { id: 33, label: 'M · smiling' },
  { id: 47, label: 'F · curly' },
  { id: 56, label: 'M · serious' },
  { id: 64, label: 'F · light bg' },
  { id: 68, label: 'M · profile' },
  { id: 14, label: 'F · headphones' },
]
const TEST_IMAGE_URL = (id: number) => `https://i.pravatar.cc/400?img=${id}`

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

type CheckResult = {
  email: string
  hasTicket: boolean
  existingAvatar: string | null
}

function NoTicketView({
  email,
  onSignOut,
  detail,
}: {
  email: string
  onSignOut: () => void
  detail?: string
}) {
  return (
    <div className="flex flex-col items-center gap-5 max-w-md w-full px-4 text-center">
      <h2 className="text-white text-2xl font-bold">No Devcon ticket found</h2>
      <p className="text-white/70 text-sm">
        We couldn&apos;t find a paid Devcon ticket linked to <strong>{email}</strong>. If you bought your ticket with a
        different email, sign out and try that one.
      </p>
      <div className="flex gap-3 mt-2">
        <Link
          href="/tickets"
          className="px-5 py-2.5 bg-[rgba(77,89,199,1)] hover:bg-[#555EB1] transition-colors duration-300 rounded-full border border-white/30 text-white font-semibold backdrop-blur-sm"
        >
          Get a ticket
        </Link>
        <button
          onClick={onSignOut}
          className="px-5 py-2.5 bg-black/40 hover:bg-black/60 border border-white/30 rounded-full text-white text-sm font-medium backdrop-blur-sm"
        >
          Use a different email
        </button>
      </div>
      {detail && <p className="text-white/30 text-xs font-mono mt-1">{detail}</p>}
    </div>
  )
}

// CROPS — Devcon's four core values. The first stop covers "CR" (Censorship
// Resistance, the C+R of CROPS). Each maps to a character whose traits the
// user will inherit. Edit the `character` field to remap.
const CROPS: { label: string; short: string; character: string }[] = [
  { label: 'Censorship Resistance', short: 'CR', character: 'aria' },
  { label: 'Open Source', short: 'O', character: 'lyra' },
  { label: 'Privacy', short: 'P', character: 'pyra' },
  { label: 'Security', short: 'S', character: 'veda' },
]

// Playful cycling status messages shown while the avatar is generating.
const LOADING_MESSAGES: readonly string[] = [
  'Tending to the CROPS...',
  'Watering the seedlings...',
  'Harvesting pixels...',
  'Sowing your portrait...',
  'Cultivating your alignment...',
  'Letting the CROPS ripen...',
  'Plowing through the prompt...',
  'Reaping fresh visuals...',
]

function AvatarGenerator({ initialAvatar, onSignOut }: { initialAvatar: string | null; onSignOut: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const sourceBase64Ref = useRef<string | null>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(!initialAvatar)

  const [selectedTestUrl, setSelectedTestUrl] = useState<string | null>(null)
  const [cropsIndex, setCropsIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const selectedCrops = CROPS[cropsIndex]
  const selectedCharacter = selectedCrops.character

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen])

  // Cycle the playful loading message every 2.5s while generating
  useEffect(() => {
    if (!loading) return
    setLoadingMsgIndex(Math.floor(Math.random() * LOADING_MESSAGES.length))
    const id = setInterval(() => {
      setLoadingMsgIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(id)
  }, [loading])

  const handleSelectTestImage = async (url: string) => {
    setError(null)
    try {
      // Fetch via a same-origin dev proxy to avoid CORS on the test-image host.
      const proxied = `/api/dev/test-image-proxy?url=${encodeURIComponent(url)}`
      const dataUrl = await urlToBase64(proxied)
      setSourcePreview(dataUrl)
      setSelectedTestUrl(url)
      sourceBase64Ref.current = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '')
    } catch {
      setError('Could not load test image (network/CORS).')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload an image under 5MB.`)
      return
    }

    try {
      const dataUrl = await fileToBase64(file)
      setSourcePreview(dataUrl)
      setSelectedTestUrl(null)
      sourceBase64Ref.current = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '')
    } catch {
      setError('Could not read the selected image.')
    }
  }

  const handleGenerate = async () => {
    if (!sourceBase64Ref.current) return
    setLoading(true)
    setError(null)
    setShowForm(false)

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Session expired — please verify your email again.')

      const body = {
        image: sourceBase64Ref.current!,
        mode: 'style' as const,
        character: selectedCharacter,
      }

      const res = await fetch(`${DEVCON_AI_URL}/api/devcon-avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Generation failed (${res.status})`)
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

  const handleStartOver = () => {
    setSourcePreview(null)
    setSelectedTestUrl(null)
    sourceBase64Ref.current = null
    setAvatarUrl(null)
    setShowForm(true)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const hasAvatar = !!avatarUrl && !loading
  const formVisible = showForm && !loading

  return (
    <div className="relative z-10 flex flex-col items-center gap-4 max-w-md w-full mx-auto px-4">
      {/* CROPS slider — pick alignment first, then upload your photo. */}
      <div
        className="flex flex-col gap-2 w-full overflow-hidden items-center mb-3"
        style={{
          maxHeight: formVisible ? '200px' : '0px',
          opacity: formVisible ? 1 : 0,
          transition: 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
        }}
      >
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="rounded-lg overflow-hidden border-2 border-[rgba(77,89,199,1)] hover:border-[rgba(77,89,199,1)]/80 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[rgba(77,89,199,1)] focus:ring-offset-2 focus:ring-offset-[#0E122F]"
            aria-label={`View ${selectedCharacter} reference image`}
          >
            <img
              src={`${DEVCON_AI_URL}/api/devcon-avatar/characters/${encodeURIComponent(selectedCharacter)}`}
              alt={selectedCharacter}
              className="w-10 h-10 object-cover block"
            />
          </button>
          <div className="flex flex-col leading-tight">
            <span className="text-white/40 text-[10px] uppercase tracking-widest leading-tight">
              I most resonate with...
            </span>
            <span className="text-white text-sm font-semibold leading-tight">{selectedCrops.label}</span>
          </div>
        </div>
        {/* Tighter slider. The native range thumb's *center* moves from
            THUMB_RADIUS to (width - THUMB_RADIUS), not 0→width. Position
            ticks/labels using that same range so they land directly under
            each thumb stop. */}
        <div className="w-full max-w-[220px] mx-auto crops-slider-wrap">
          <style jsx>{`
            .crops-slider-wrap input[type='range'] {
              -webkit-appearance: none;
              appearance: none;
              background: transparent;
            }
            .crops-slider-wrap input[type='range']::-webkit-slider-runnable-track {
              height: 4px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 9999px;
            }
            .crops-slider-wrap input[type='range']::-moz-range-track {
              height: 4px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 9999px;
            }
            .crops-slider-wrap input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 9999px;
              background: rgba(77, 89, 199, 1);
              cursor: pointer;
              border: none;
              margin-top: -6px;
            }
            .crops-slider-wrap input[type='range']::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 9999px;
              background: rgba(77, 89, 199, 1);
              cursor: pointer;
              border: none;
            }
          `}</style>
          <div className="relative w-full pt-1">
            <input
              type="range"
              min={0}
              max={CROPS.length - 1}
              step={1}
              value={cropsIndex}
              onChange={e => setCropsIndex(Number(e.target.value))}
              className="w-full cursor-pointer block relative z-10"
            />
            {/* Tick dots overlaid on the input, centered on the 4px track */}
            <div className="absolute inset-0 pt-1 pointer-events-none">
              <div className="relative w-full h-full">
                {CROPS.map((c, i) => (
                  <span
                    key={`tick-${c.short}`}
                    aria-hidden
                    className={`absolute w-1 h-1 rounded-full ${i === cropsIndex ? 'bg-white' : 'bg-white/40'}`}
                    style={{
                      left: `calc((100% - 16px) * ${i / (CROPS.length - 1)} + 8px)`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="relative h-5 w-full mt-3">
            {CROPS.map((c, i) => (
              <button
                key={c.short}
                type="button"
                onClick={() => setCropsIndex(i)}
                style={{
                  left: `calc((100% - 16px) * ${i / (CROPS.length - 1)} + 8px)`,
                  transform: 'translateX(-50%)',
                }}
                className={`absolute text-sm transition-colors whitespace-nowrap ${
                  i === cropsIndex ? 'text-white font-semibold' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {c.short}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="w-56 h-56 md:w-64 md:h-64 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden shrink-0"
        style={
          {
            border: '3px solid transparent',
            boxShadow:
              '0 0 30px rgba(77, 89, 199, 0.4), 0 0 60px rgba(77, 89, 199, 0.15), inset 0 0 30px rgba(77, 89, 199, 0.1)',
            backgroundImage:
              'linear-gradient(#0E122F, #0E122F), linear-gradient(135deg, rgba(77,89,199,0.8), rgba(254,122,6,0.6), rgba(77,89,199,0.8))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            transform: hasAvatar && !showForm ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
          } as React.CSSProperties
        }
      >
        {loading ? (
          <span
            key={loadingMsgIndex}
            className="text-white/60 text-sm font-medium text-center px-4 animate-in fade-in duration-500"
          >
            {LOADING_MESSAGES[loadingMsgIndex]}
          </span>
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Devcon avatar"
            className="w-full h-full object-cover cursor-pointer hover:brightness-75 transition-all duration-300"
            onClick={() => setShowForm(prev => !prev)}
            title="Click to upload a different photo"
          />
        ) : sourcePreview ? (
          <img src={sourcePreview} alt="Source preview" className="w-full h-full object-contain" />
        ) : (
          <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        )}
      </div>

      <div
        className="flex flex-col gap-3 w-full overflow-hidden items-center"
        style={{
          maxHeight: formVisible ? '400px' : '0px',
          opacity: formVisible ? 1 : 0,
          transition: 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="source-image-input"
        />
        <label
          htmlFor="source-image-input"
          className="px-5 py-2 bg-black/40 hover:bg-black/60 border border-white/30 rounded-full text-white text-xs font-medium backdrop-blur-sm cursor-pointer transition-colors duration-200"
        >
          {sourcePreview ? 'Choose a different photo' : 'Choose a photo'}
        </label>

        {SHOW_TEST_IMAGES && (
          <div className="flex flex-col gap-1.5 w-full mt-1 pt-2 border-t border-white/10">
            <p className="text-white/30 text-[10px] uppercase tracking-widest text-center">Dev test images</p>
            <div className="grid grid-cols-10 gap-1 w-full">
              {TEST_IMAGES.map(img => {
                const url = TEST_IMAGE_URL(img.id)
                const isSelected = selectedTestUrl === url
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => handleSelectTestImage(url)}
                    title={img.label}
                    className={`aspect-square overflow-hidden rounded border transition-all ${
                      isSelected ? 'border-[rgba(77,89,199,1)] scale-90' : 'border-white/20 hover:border-white/60'
                    }`}
                  >
                    <img src={url} alt={img.label} className="w-full h-full object-cover" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {formVisible && (
        <button
          onClick={handleGenerate}
          disabled={!sourceBase64Ref.current}
          className="px-7 py-2.5 bg-[rgba(77,89,199,1)] hover:bg-[#555EB1] transition-colors duration-300 rounded-full border border-white/30 text-white font-semibold text-sm backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⧫ Transcend ⧫
        </button>
      )}

      {hasAvatar && !showForm && (
        <button
          onClick={handleStartOver}
          className="px-7 py-2.5 bg-[rgba(77,89,199,1)] hover:bg-[#555EB1] transition-colors duration-300 rounded-full border border-white/30 text-white font-semibold text-sm backdrop-blur-sm"
        >
          Try another photo
        </button>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={onSignOut}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/70 text-xs underline-offset-4 hover:underline transition-colors z-20"
      >
        Switch email
      </button>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCharacter} reference image`}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center transition-colors"
          >
            ×
          </button>
          <img
            src={`${DEVCON_AI_URL}/api/devcon-avatar/characters/${encodeURIComponent(selectedCharacter)}`}
            alt={selectedCharacter}
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

function GatedAvatar({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('Session expired')
        const res = await fetch(`${DEVCON_AI_URL}/api/devcon-avatar/check`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Check failed (${res.status})`)
        }
        const data = (await res.json()) as CheckResult
        if (!cancelled) setCheck(data)
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  // Treat any server error the same as "no ticket" from the user's perspective —
  // both end up at the same dead end (no avatar can be generated), and the user
  // most likely needs to switch to a different email either way. Surface the
  // raw error in muted text below so it's still debuggable.
  if (error) {
    return <NoTicketView email={email} onSignOut={onSignOut} detail={error} />
  }

  if (!check) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        <span className="text-white/50 text-xs">Checking your ticket...</span>
      </div>
    )
  }

  if (!check.hasTicket) {
    return <NoTicketView email={check.email} onSignOut={onSignOut} />
  }

  return <AvatarGenerator initialAvatar={check.existingAvatar} onSignOut={onSignOut} />
}

export default function AvatarPage() {
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setSessionChecked(true)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setVerifiedEmail(session?.user?.email ?? null)
      setSessionChecked(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setVerifiedEmail(session?.user?.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setVerifiedEmail(null)
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#0E122F] py-6">
      <SEO title="Avatar" noIndex />
      <Image
        src={HeroBackground}
        alt="Background"
        fill
        placeholder="blur"
        className="object-cover pointer-events-none opacity-30"
      />

      {sessionChecked && (
        <div className={`relative z-10 w-full px-4 mx-auto ${verifiedEmail ? 'max-w-2xl' : 'max-w-md'}`}>
          {verifiedEmail ? (
            <GatedAvatar email={verifiedEmail} onSignOut={handleSignOut} />
          ) : (
            <div className="bg-white rounded-2xl p-6 md:p-10">
              <OtpGate
                title="Sign in"
                description="Enter the email you used to buy your Devcon ticket"
                emailPlaceholder="you@example.com"
                redirectUrl={AVATAR_REDIRECT_URL}
                hideVerifiedHeader
              >
                {() => null}
              </OtpGate>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
