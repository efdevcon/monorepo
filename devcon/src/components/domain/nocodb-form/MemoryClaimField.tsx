import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import cn from 'classnames'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, CircleAlert, Clock3, Loader2 } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { useBuilderConnect } from 'context/BuilderConnectContext'
import {
  memoryFailureMessage,
  memoryNftLink,
  memoryNumber,
  memoryTxUrl,
  msToNextSlot,
  normalizeCode,
  shortHash,
  slotNumber,
  slotPhase,
  MEMORY_MEDIA,
  SLOT_SECONDS,
  type MemoryState,
} from 'services/memory/memory'
import { useWalletLabel } from 'hooks/usePrimaryEnsName'
import { rhfFieldName } from './rhf-key'

export type MemoryClaim = { code: string; initial: MemoryState }

const CODE_STORAGE_KEY = 'devcon8-memory-code'

/**
 * Takes the code from the emailed link (`?code=`, which devcon.org's Matomo
 * setup excludes; `#code=` from early test links works too) and clears it from
 * the address bar, so a survey URL copied to share never carries it. The tab
 * keeps it in sessionStorage, so a reload still finds it.
 */
function takeCodeFromUrl(): string | null {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.slice(1))
  const raw = url.searchParams.get('code') ?? hash.get('code')
  if (raw !== null) {
    url.searchParams.delete('code')
    hash.delete('code')
    url.hash = hash.toString()
    const clean = url.pathname + url.search + url.hash
    // The Pages Router keeps its own state in each history entry: keep it, with the new URL.
    window.history.replaceState({ ...window.history.state, as: clean, url: clean }, '', clean)
  }
  const fromUrl = raw ? normalizeCode(raw) : null
  try {
    if (fromUrl) sessionStorage.setItem(CODE_STORAGE_KEY, fromUrl)
    return fromUrl ?? sessionStorage.getItem(CODE_STORAGE_KEY)
  } catch {
    return fromUrl
  }
}

function forgetCode() {
  try {
    sessionStorage.removeItem(CODE_STORAGE_KEY)
  } catch {
    // Storage blocked: nothing was kept.
  }
}

/**
 * The memory code from the emailed link, once the server knows it. The code
 * only ever comes from the link; there is no field to type one. Only
 * checked-in tickets get a code, so null means no memory for this visitor (no
 * link, a broken or unknown code, or minting not open) and the form hides the
 * memory card and its wallet field altogether.
 */
export function useMemoryCode(enabled: boolean): MemoryClaim | null {
  const [claim, setClaim] = useState<MemoryClaim | null>(null)
  useEffect(() => {
    if (!enabled) return
    const code = takeCodeFromUrl()
    if (!code) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const check = async (attempt: number) => {
      try {
        const initial = await callMemory({ action: 'status', code })
        if (!cancelled) setClaim({ code, initial })
      } catch (e) {
        // A refused code stays hidden (and forgotten); a network blip gets two more tries.
        const refused = /doesn.t match|aren.t open/.test(e instanceof Error ? e.message : '')
        if (refused) forgetCode()
        else if (!cancelled && attempt < 3) timer = setTimeout(() => void check(attempt + 1), 3000)
      }
    }
    void check(1)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled])
  return claim
}

/**
 * The `[memory]` field (config/form-field-markers.ts): the Devcon 8 Memory,
 * ported from the event app's perk card, rendered only for a known code
 * (useMemoryCode). It mints the NFT to the wallet connected in the form's
 * `[wallet]` field; the server takes the address from the wallet's signed
 * proof (api/memory). The art keeps time with real Ethereum slots: still
 * before, one turn per 12 s slot while the mint is on its way, and the lit
 * loop (the NFT itself) the moment it lands. Minting doesn't wait for the
 * survey: once minted, the field records "Memory #<token>" for the submission.
 */
export function MemoryClaimField({
  columnName,
  walletColumnName,
  claim,
}: {
  columnName: string
  walletColumnName?: string
  claim: MemoryClaim
}) {
  const { setValue, watch } = useFormContext()
  const { walletProof } = useBuilderConnect()
  const wallet = walletColumnName ? (watch(rhfFieldName(walletColumnName)) as string | undefined) : undefined
  const walletLabel = useWalletLabel(wallet)
  const { memory, mint, pending, error, statusError } = useMemoryClaim(claim)

  useEffect(() => {
    if (memory.state === 'minted') setValue(rhfFieldName(columnName), `Memory #${memoryNumber(memory.tokenId)}`)
  }, [memory, columnName, setValue])

  return (
    <div className="flex w-full flex-col rounded-xl border border-[#dddae2] bg-white p-4 sm:max-w-[400px]">
      <MemoryArt state={memory.state} />

      {memory.state === 'minting' ? (
        <Minting memory={memory} statusError={statusError} />
      ) : memory.state === 'minted' ? (
        <Minted memory={memory} />
      ) : (
        <div className="mt-3">
          {memory.state === 'failed' && <Notice tone="error">{memoryFailureMessage(memory.reason)}</Notice>}

          {!walletProof ? (
            <p className="mt-3 text-sm font-semibold leading-5 text-[#160b2b]">
              Connect your wallet above, then mint your memory here.
            </p>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 text-sm leading-5 text-[#594d73]">
                To{' '}
                <span className="font-semibold text-[#160b2b]" title={wallet}>
                  {walletLabel ?? 'your wallet'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => mint(walletProof)}
                disabled={pending}
                className="h-10 shrink-0 cursor-pointer rounded-full bg-[#7235ed] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
              >
                {pending ? 'Minting…' : 'Mint'}
              </button>
            </div>
          )}
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- data

type Response = { success: boolean; data?: MemoryState; error?: string }

async function callMemory(body: Record<string, string>): Promise<MemoryState> {
  const res = await fetch('/api/memory/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json: Response = await res.json().catch(() => ({ success: false, error: 'Unexpected response' }))
  if (!json.success || !json.data) throw new Error(json.error || 'Something went wrong, please try again')
  return json.data
}

/** The code's memory: starts from the status read by useMemoryCode, polled every 3 s while minting (each poll moves the queue). */
function useMemoryClaim({ code, initial }: MemoryClaim) {
  const [memory, setMemory] = useState<MemoryState>(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState(false)
  // Restarts the polling when a mint starts, so it picks the new state up.
  const minting = memory.state === 'minting'

  useEffect(() => {
    if (!minting) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      try {
        const next = await callMemory({ action: 'status', code })
        if (cancelled) return
        setMemory(next)
        setStatusError(false)
        if (next.state === 'minting') timer = setTimeout(poll, 3000)
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : ''
        // A refused code ends the polling; a network blip retries.
        if (/doesn.t match|aren.t open/.test(message)) setError(message)
        else {
          setStatusError(true)
          timer = setTimeout(poll, 3000)
        }
      }
    }
    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [code, minting])

  const mint = useCallback(
    async (walletProof: string) => {
      if (!code) return
      setPending(true)
      setError(null)
      try {
        setMemory(await callMemory({ action: 'mint', code, walletProof }))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong, please try again')
      } finally {
        setPending(false)
      }
    },
    [code]
  )

  return { memory, mint, pending, error, setError, statusError }
}

// ---------------------------------------------------------------- states

/** The mint's onchain steps; waiting in the batch queue reads as "Sending". */
const STEPS = [
  {
    key: 'send',
    active: 'Sending your mint transaction',
    done: 'Transaction sent',
    waiting: 'Send your mint transaction',
    hint: null,
  },
  {
    key: 'block',
    active: 'Waiting for the next block',
    done: 'Confirmed in a block',
    waiting: 'Confirmed in a block',
    hint: 'A new block every 12 seconds',
  },
] as const

function Notice({ tone, children }: { tone: 'error' | 'warning'; children: ReactNode }) {
  const Icon = tone === 'error' ? CircleAlert : Clock3
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] leading-[18px]',
        tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
      )}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0">{children}</p>
    </div>
  )
}

function Minting({
  memory,
  statusError,
}: {
  memory: Extract<MemoryState, { state: 'minting' }>
  statusError: boolean
}) {
  const recipient = useWalletLabel(memory.recipient)
  // Done steps come before the active one; the rest wait.
  const active = memory.step === 'queued' ? 0 : 1
  return (
    <div className="mt-3" aria-live="polite">
      <SlotClock />
      <p className="mt-3 text-sm leading-5 text-[#594d73]">
        Minting to{' '}
        <span className="font-semibold text-[#160b2b]" title={memory.recipient}>
          {recipient}
        </span>
      </p>
      <ol className="mt-2 flex flex-col gap-1.5">
        {STEPS.map((step, i) => {
          const status = i < active ? 'done' : i === active ? 'active' : 'waiting'
          return (
            <li
              key={step.key}
              className={cn(
                'flex items-start gap-2 text-sm leading-5',
                status === 'waiting' ? 'text-[#594d73]/60' : 'text-[#160b2b]',
                status === 'active' && 'font-semibold'
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                {status === 'done' ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-[#7235ed] text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : status === 'active' ? (
                  <Loader2 className="size-4 animate-spin text-[#7235ed]" />
                ) : (
                  <span className="size-2 rounded-full bg-[#dddae2]" />
                )}
              </span>
              <span>
                {step[status]}
                {status === 'active' && step.hint && (
                  <span className="block text-xs font-normal leading-4 text-[#594d73]">{step.hint}</span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      {memory.retrying && <Notice tone="warning">Taking longer than usual: the transaction is being retried.</Notice>}
      {statusError && <Notice tone="warning">Can&rsquo;t reach the server right now. Retrying&hellip;</Notice>}
    </div>
  )
}

function Minted({ memory }: { memory: Extract<MemoryState, { state: 'minted' }> }) {
  const recipient = useWalletLabel(memory.recipient)
  const txUrl = memoryTxUrl(memory)
  const nftLink = memoryNftLink(memory)
  const linkClass =
    'inline-flex min-h-8 items-center gap-1 text-sm font-bold leading-5 text-[#7235ed] underline-offset-2 hover:underline'
  return (
    <div className="mt-3" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold leading-5 text-[#160b2b]">
        <span className="flex size-4 items-center justify-center rounded-full bg-[#7235ed] text-white" aria-hidden>
          <Check className="size-3" strokeWidth={3} />
        </span>
        Memory #{memoryNumber(memory.tokenId)} minted
      </p>
      <p className="mt-1 text-sm leading-5 text-[#594d73]">
        To{' '}
        <span className="font-semibold text-[#160b2b]" title={memory.recipient}>
          {recipient}
        </span>
        .{memory.blockNumber ? ` Confirmed in block ${memory.blockNumber.toLocaleString('en-US')}.` : ''}
      </p>
      {(txUrl || nftLink) && (
        <div className="mt-2 flex flex-wrap gap-x-5">
          {txUrl && memory.txHash && (
            <a href={txUrl} target="_blank" rel="noreferrer" className={linkClass}>
              View tx <span className="tabular-nums">{shortHash(memory.txHash)}</span>
              <ArrowUpRight className="size-4 shrink-0" />
            </a>
          )}
          {nftLink && (
            <a href={nftLink.url} target="_blank" rel="noreferrer" className={linkClass}>
              {nftLink.label}
              <ArrowUpRight className="size-4 shrink-0" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The live Ethereum slot: its number and a bar that fills over its 12 s, in
 * step with the logo's turn. Real chain time on purpose (Date.now), so it
 * stays on the beacon chain's boundaries.
 */
function SlotClock() {
  const [slot, setSlot] = useState<{ number: number; phase: number } | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const now = Date.now()
      setSlot({ number: slotNumber(now), phase: slotPhase(now) })
      timer = setTimeout(tick, msToNextSlot(now) + 15)
    }
    tick()
    return () => clearTimeout(timer)
  }, [])
  return (
    <div className="flex items-center gap-3">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#f5f1fe]">
        {slot && (
          <motion.div
            key={slot.number}
            className="h-full origin-left rounded-full bg-[#7235ed]"
            initial={{ scaleX: slot.phase }}
            animate={{ scaleX: 1 }}
            transition={{ duration: (1 - slot.phase) * SLOT_SECONDS, ease: 'linear' }}
          />
        )}
      </div>
      <span className="shrink-0 text-xs tabular-nums leading-4 text-[#594d73]">
        {slot ? `Slot ${slot.number.toLocaleString('en-US')}` : 'Slot'}
      </span>
    </div>
  )
}

// ------------------------------------------------------------------- art

/**
 * Still before, spin while minting, lit once minted. The spin and the lit
 * loop share every frame's timing and both follow the slot clock, so the lit
 * loop runs hidden under the spin and the swap is seamless whenever the mint
 * lands, marked by a short saffron flash.
 */
function MemoryArt({ state }: { state: MemoryState['state'] }) {
  const phase = state === 'minting' ? 'spin' : state === 'minted' ? 'lit' : 'still'
  // Count reveals seen on this page (not a memory loaded already minted).
  const [reveal, setReveal] = useState({ previous: phase, count: 0 })
  if (reveal.previous !== phase) {
    setReveal({ previous: phase, count: reveal.count + (reveal.previous === 'spin' && phase === 'lit' ? 1 : 0) })
  }
  const label =
    phase === 'lit'
      ? 'Your Devcon 8 Memory: the Devcon 8 logo, lit, with Diwali sparkles'
      : phase === 'spin'
      ? 'The Devcon 8 logo, turning while your memory is minted'
      : 'The Devcon 8 logo'
  return (
    <div
      role="img"
      aria-label={label}
      className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-[#0e0933]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MEMORY_MEDIA.still} alt="" className="absolute inset-0 size-full object-cover" />
      {phase !== 'still' && (
        <>
          <SlotVideo src={MEMORY_MEDIA.memory} poster={MEMORY_MEDIA.poster} visible={phase === 'lit'} />
          <SlotVideo src={MEMORY_MEDIA.spin} visible={phase === 'spin'} />
        </>
      )}
      {reveal.count > 0 && (
        <motion.div
          key={reveal.count}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(255,246,214,0.95) 0%, rgba(255,170,85,0.55) 28%, rgba(255,170,85,0) 62%)',
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.95, 0], scale: [0.6, 1.05, 1.4] }}
          transition={{ duration: 0.9, ease: 'easeOut', times: [0, 0.25, 1] }}
        />
      )}
    </div>
  )
}

/**
 * A 12 s loop kept on the beacon chain's slot clock (frame 0 at every slot
 * boundary). It plays while mounted, shown or not, so a hidden loop is
 * already on the right frame when it appears.
 */
function SlotVideo({ src, poster, visible }: { src: string; poster?: string; visible: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const sync = () => {
      const target = slotPhase(Date.now()) * SLOT_SECONDS
      const off = Math.abs(video.currentTime - target)
      if (off > 0.2 && off < SLOT_SECONDS - 0.2) video.currentTime = target
    }
    sync()
    void video.play().catch(() => {})
    video.addEventListener('loadedmetadata', sync)
    const id = setInterval(sync, 3000)
    return () => {
      clearInterval(id)
      video.removeEventListener('loadedmetadata', sync)
      video.pause()
    }
  }, [])
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      className={cn(
        'absolute inset-0 size-full object-cover transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    />
  )
}
