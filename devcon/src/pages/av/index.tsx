import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  AlertTriangle,
  Download,
  Film,
  ExternalLink,
  Laptop,
  Loader2,
  Presentation,
  RefreshCw,
  Pencil,
  RotateCcw,
  Search,
  Check,
  ChevronLeft,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  X,
} from 'lucide-react'
import { AV_TIMEZONE } from 'services/av/av-assets'
import introVideos from 'services/av/intro-videos.json'
import type { AvSessionDetail, AvSessionSummary, AvSpeaker, AvStage } from 'services/av/pretalx'
import { useNow } from 'hooks/useNow'
import { AV_PASSWORD_KEY, clearStoredPassword, readStoredPassword, storePassword } from 'utils/adminPassword'

// AV cards for one session, made fresh from Pretalx: for a stage operator at
// the desk when something changed minutes before a talk and the nightly AV
// pipeline (schedule release, devcon-api sync, Drive upload) has not caught
// up. Same cards, sizes and file names as the files in the AV Drive. Behind
// the AV crew's password (AV_PASSWORD), like the tickets admin: the page asks
// for it once per device and sends it with every request.

// The site's global reset sets `border: 0` on everything (style included), so
// every bordered element here also needs `border-solid`.
const CARD = 'rounded-2xl border border-solid border-[#e5e1ed] bg-white p-5'
const BUTTON =
  'inline-flex items-center gap-2 rounded-full border border-solid border-[#d6d0e3] bg-white px-4 py-2 text-sm font-semibold hover:border-[#7235ed] disabled:opacity-60'
const PRIMARY_BUTTON =
  'inline-flex items-center gap-2 rounded-full bg-[#7235ed] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5f26d4] disabled:opacity-50'
const FIELD =
  'w-full rounded-xl border border-solid border-[#d6d0e3] bg-[#f7f5fb] px-4 py-3 text-base text-[#160b2b] outline-none transition placeholder:text-[#9a93ab] focus:border-[#7235ed] focus:bg-white focus:ring-4 focus:ring-[#7235ed]/15 disabled:opacity-60'
const FIELD_LABEL = 'text-xs font-semibold uppercase tracking-wide text-[#5b5370]'

const whenFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: AV_TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
/**
 * fetch with the stored AV password. A 401 means the password was rotated or
 * cleared: forget it and reload to the login screen.
 */
async function avFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), 'x-admin-key': readStoredPassword(AV_PASSWORD_KEY) ?? '' },
  })
  if (res.status === 401) {
    clearStoredPassword(AV_PASSWORD_KEY)
    window.location.reload()
  }
  return res
}

const when = (iso: string | null) => (iso ? whenFormat.format(new Date(iso)) : 'not scheduled')

/** File name the API put in Content-Disposition. */
function fileNameOf(res: Response, fallback: string): string {
  const header = res.headers.get('Content-Disposition') || ''
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star) return decodeURIComponent(star[1])
  const plain = /filename="([^"]+)"/i.exec(header)
  return plain ? plain[1] : fallback
}

interface Asset {
  key: string
  label: string
  url: string
  /** Width / height, for the preview box. */
  ratio: number
  /** Pixel size, when an intro video can be made from this card. */
  video?: { width: number; height: number }
}

interface Loaded {
  objectUrl: string
  fileName: string
  bytes: number
}

/** One asset: fetched as a blob, previewed and downloaded from the same bytes. */
function AssetTile({
  asset,
  nonce,
  onReady,
}: {
  asset: Asset
  nonce: number
  onReady: (key: string, loaded: Loaded | null) => void
}) {
  const [state, setState] = useState<{ loaded?: Loaded; error?: string; loading: boolean }>({ loading: true })

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setState({ loading: true })
    onReady(asset.key, null)
    avFetch(`${asset.url}${asset.url.includes('?') ? '&' : '?'}t=${nonce}`, { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || `HTTP ${res.status}`)
        }
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        const loaded = { objectUrl, fileName: fileNameOf(res, `${asset.key}.jpg`), bytes: blob.size }
        setState({ loaded, loading: false })
        onReady(asset.key, loaded)
      })
      .catch(e => !cancelled && setState({ error: e instanceof Error ? e.message : String(e), loading: false }))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset.key, asset.url, nonce, onReady])

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-solid border-[#e5e1ed] bg-[#f7f5fb] p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{asset.label}</span>
        {state.loaded && <span className="text-xs text-[#5b5370]">{Math.round(state.loaded.bytes / 1024)} KB</span>}
      </div>
      <div
        className="flex w-full items-center justify-center overflow-hidden rounded-lg bg-[#160b2b]/5"
        style={{ aspectRatio: String(asset.ratio) }}
      >
        {state.loading && <Loader2 className="size-6 animate-spin text-[#7235ed]" />}
        {state.error && (
          <p className="px-3 text-center text-sm text-red-700">
            <AlertTriangle className="mb-1 inline size-4" /> {state.error}
          </p>
        )}
        {state.loaded && (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: URL, nothing for next/image to optimise
          <img src={state.loaded.objectUrl} alt={asset.label} className="h-full w-full object-contain" />
        )}
      </div>
      {state.loaded && (
        <>
          <p className="break-all text-xs text-[#5b5370]">{state.loaded.fileName}</p>
          <div className="flex flex-wrap gap-2">
            <a href={state.loaded.objectUrl} download={state.loaded.fileName} className={BUTTON}>
              <Download className="size-4" />
              Download
            </a>
            {asset.video && hasIntro(asset.video.width, asset.video.height) && (
              <IntroVideoButton card={state.loaded} source={asset.url} {...asset.video} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

const hasIntro = (width: number, height: number) => `${width}x${height}` in introVideos

const saveBlob = (url: string, fileName: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
}

/**
 * Renders the intro animation over this card in the browser and downloads the
 * mp4 when it is ready (a few seconds in Chrome). Remotion loads on the first
 * click only. The card under the animation is the lossless PNG of `source`
 * (the card route), not the JPEG preview, so it is compressed only once.
 */
function IntroVideoButton({
  card,
  source,
  width,
  height,
}: {
  card: Loaded
  source: string
  width: number
  height: number
}) {
  const [state, setState] = useState<{ progress?: number; url?: string; error?: string }>({})
  const fileName = card.fileName.replace(/ - (YouTube|Screen) /, ' - Intro $1 ').replace(/\.jpg$/i, '.mp4')

  // A new card (regenerated, edited) makes any earlier video stale.
  useEffect(() => {
    setState({})
  }, [card.objectUrl])
  useEffect(() => () => void (state.url && URL.revokeObjectURL(state.url)), [state.url])

  const generate = async () => {
    setState({ progress: 0 })
    let png: string | null = null
    try {
      const [{ renderIntroVideo }, res] = await Promise.all([
        import('services/av/intro-video'),
        avFetch(`${source}${source.includes('?') ? '&' : '?'}format=png`, { cache: 'no-store' }),
      ])
      if (!res.ok) throw new Error(`card: HTTP ${res.status}`)
      png = URL.createObjectURL(await res.blob())
      const blob = await renderIntroVideo({
        card: png,
        width,
        height,
        onProgress: progress => setState(s => (s.url ? s : { progress })),
      })
      const url = URL.createObjectURL(blob)
      setState({ url })
      saveBlob(url, fileName)
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      if (png) URL.revokeObjectURL(png)
    }
  }

  if (state.url)
    return (
      <a href={state.url} download={fileName} className={BUTTON}>
        <Film className="size-4" />
        Video again
      </a>
    )
  if (state.progress !== undefined)
    return (
      <span className={`${BUTTON} relative overflow-hidden`} aria-live="polite">
        <span
          className="absolute inset-y-0 left-0 bg-[#7235ed]/15 transition-[width]"
          style={{ width: `${Math.round(state.progress * 100)}%` }}
        />
        <Loader2 className="relative size-4 animate-spin" />
        <span className="relative tabular-nums">Video {Math.round(state.progress * 100)}%</span>
      </span>
    )
  return (
    <>
      <button
        type="button"
        onClick={generate}
        className={BUTTON}
        title={`Intro animation over this card, ${width}x${height} mp4`}
      >
        <Film className="size-4" />
        {state.error ? 'Retry video' : 'Intro video'}
      </button>
      {state.error && <p className="w-full text-xs text-red-700">{state.error}</p>}
    </>
  )
}

function Section({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${CARD} flex flex-col gap-3`}>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {note && <p className="text-sm text-[#5b5370]">{note}</p>}
      </div>
      {children}
    </section>
  )
}

const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'

/** Copies `text`, falling back to a prompt-free selection when the clipboard API is refused. */
function CopyButton({ text, label = 'Copy link' }: { text: string | (() => string); label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    text = typeof text === 'function' ? text() : text
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const input = document.createElement('textarea')
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" onClick={copy} className={BUTTON}>
      {copied ? <Check className="size-4 text-green-700" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

/** Hand edits to the cards, applied by the card routes (?title=, ?speakers=). */
interface CardEdits {
  title: string
  speakers: AvSpeaker[]
}

const editsQuery = (edits: CardEdits | null): string => {
  if (!edits) return ''
  const q = new URLSearchParams({ title: edits.title, speakers: edits.speakers.map(s => s.code).join(',') })
  return `?${q.toString()}`
}

/**
 * Fix the title or the speakers on the cards when Pretalx is not up to date
 * yet. Speakers come from the official list only (speakers on confirmed
 * sessions), so a card never names someone Pretalx does not have.
 */
function CardEditor({
  session,
  applied,
  onApply,
}: {
  session: AvSessionDetail
  applied: CardEdits | null
  onApply: (edits: CardEdits | null) => void
}) {
  const [title, setTitle] = useState(applied?.title ?? session.title)
  const [speakers, setSpeakers] = useState<AvSpeaker[]>(applied?.speakers ?? session.speakerList)
  const [official, setOfficial] = useState<AvSpeaker[] | null>(null)
  const [officialError, setOfficialError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    avFetch('/api/av/speakers/')
      .then(res => res.json())
      .then(body => (body.success ? setOfficial(body.data) : setOfficialError(body.error)))
      .catch(() => setOfficialError('could not load the speaker list'))
  }, [])

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!official || !q) return []
    return official
      .filter(
        s => !speakers.some(p => p.code === s.code) && (s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q)
      )
      .slice(0, 8)
  }, [official, search, speakers])

  const changed =
    title.trim() !== session.title ||
    speakers.map(s => s.code).join(',') !== session.speakerList.map(s => s.code).join(',')

  const add = (s: AvSpeaker) => {
    setSpeakers(l => [...l, s])
    setSearch('')
  }
  const dirty =
    title.trim() !== (applied?.title ?? session.title) ||
    speakers.map(s => s.code).join(',') !== (applied?.speakers ?? session.speakerList).map(s => s.code).join(',')

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between">
          <span className={FIELD_LABEL}>Title</span>
          <span className="text-xs tabular-nums text-[#9a93ab]">{title.length}/200</span>
        </span>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} className={FIELD} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>Speakers</span>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-solid border-[#d6d0e3] bg-[#f7f5fb] px-2 py-2 transition focus-within:border-[#7235ed] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#7235ed]/15">
            {speakers.map((s, i) => (
              <span
                key={s.code}
                className="inline-flex items-center gap-0.5 rounded-full bg-[#7235ed] py-1 pl-3 pr-1 text-sm font-semibold text-white"
              >
                {s.name}
                {i > 0 && (
                  <button
                    type="button"
                    aria-label={`Move ${s.name} earlier`}
                    title="Move earlier"
                    onClick={() => setSpeakers(l => [...l.slice(0, i - 1), l[i], l[i - 1], ...l.slice(i + 1)])}
                    className="rounded-full p-0.5 hover:bg-white/20"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${s.name}`}
                  title="Remove"
                  onClick={() => setSpeakers(l => l.filter(p => p.code !== s.code))}
                  className="rounded-full p-0.5 hover:bg-white/20"
                >
                  <X className="size-4" />
                </button>
              </span>
            ))}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && suggestions[0]) {
                  e.preventDefault()
                  add(suggestions[0])
                }
                if (e.key === 'Backspace' && !search && speakers.length) setSpeakers(l => l.slice(0, -1))
              }}
              placeholder={official ? 'Type a name to add a speaker' : 'Loading the official speaker list…'}
              disabled={!official}
              className="min-w-[12rem] flex-1 bg-transparent px-2 py-1 text-base outline-none placeholder:text-[#9a93ab]"
            />
          </div>
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-solid border-[#d6d0e3] bg-white py-1 shadow-lg">
              {suggestions.map((s, i) => (
                <li key={s.code}>
                  <button
                    type="button"
                    onClick={() => add(s)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-[#f7f5fb] ${
                      i === 0 ? 'bg-[#f7f5fb]' : ''
                    }`}
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs text-[#9a93ab]">{s.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-[#5b5370]">
          Official list only (speakers on confirmed sessions). The first speaker leads on the card.
        </p>
        {officialError && <p className="text-sm text-red-700">{officialError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={!title.trim() || !dirty}
          onClick={() => onApply(changed ? { title: title.trim(), speakers } : null)}
        >
          <Pencil className="size-4" />
          Apply to the cards
        </button>
        {applied && (
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              setTitle(session.title)
              setSpeakers(session.speakerList)
              onApply(null)
            }}
          >
            <RotateCcw className="size-4" />
            Back to Pretalx
          </button>
        )}
        {dirty && <span className="text-sm text-amber-800">Not applied yet</span>}
      </div>
    </div>
  )
}

const STAGE_KEY = 'av.stage'
const readStage = (): number | null => {
  try {
    const v = Number(localStorage.getItem(STAGE_KEY))
    return Number.isInteger(v) && v > 0 ? v : null
  } catch {
    return null
  }
}
const saveStage = (id: number | null) => {
  try {
    if (id) localStorage.setItem(STAGE_KEY, String(id))
    else localStorage.removeItem(STAGE_KEY)
  } catch {
    /* private mode: the stage is just not remembered */
  }
}

const dayOf = (d: Date | string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: AV_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(d)
  )
const dayLabel = (day: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(`${day}T00:00:00Z`)
  )
const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: AV_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const clock = (iso: string | null) => (iso ? clockFormat.format(new Date(iso)) : '--:--')

/** Today in event time when the event is on, else its first day before it starts, else its last. */
function defaultDay(days: string[], now: Date): string | null {
  if (days.length === 0) return null
  const today = dayOf(now)
  if (days.includes(today)) return today
  return today < days[0] ? days[0] : days[days.length - 1]
}

function AvTool({ onLogout }: { onLogout: () => void }) {
  const router = useRouter()
  const now = useNow(30_000)
  const [setup, setSetup] = useState<{ stages: AvStage[]; days: string[] } | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [stageId, setStageId] = useState<number | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [stageSessions, setStageSessions] = useState<AvSessionSummary[] | null>(null)
  const [stageError, setStageError] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [session, setSession] = useState<AvSessionDetail | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [loadingCode, setLoadingCode] = useState<string | null>(null)
  const [nonce, setNonce] = useState(() => Date.now())
  const [edits, setEdits] = useState<CardEdits | null>(null)
  const ready = useRef(new Map<string, Loaded>())

  const setQuery = useCallback(
    (changes: Record<string, string | null>) => {
      const query: Record<string, string> = {}
      for (const [k, v] of Object.entries({ ...router.query, ...changes })) if (typeof v === 'string' && v) query[k] = v
      router.replace({ query }, undefined, { shallow: true })
    },
    [router]
  )

  useEffect(() => {
    avFetch('/api/av/stages/')
      .then(res => res.json())
      .then(body => (body.success ? setSetup(body.data) : setSetupError(body.error)))
      .catch(() => setSetupError('could not load the stages'))
  }, [])

  // The stage: ?stage= first (a shared link), else the one this device picked last.
  useEffect(() => {
    if (!router.isReady) return
    const fromQuery = Number(router.query.stage)
    setStageId(Number.isInteger(fromQuery) && fromQuery > 0 ? fromQuery : readStage())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady])

  useEffect(() => {
    if (!day && setup && now) setDay(defaultDay(setup.days, now))
  }, [day, setup, now])

  const loadStage = useCallback((id: number) => {
    setStageSessions(null)
    setStageError(null)
    avFetch(`/api/av/stage/${id}/`)
      .then(res => res.json())
      .then(body => (body.success ? setStageSessions(body.data) : setStageError(body.error)))
      .catch(() => setStageError('could not load this stage'))
  }, [])

  useEffect(() => {
    if (stageId) loadStage(stageId)
  }, [stageId, loadStage])

  const pickStage = (id: number | null) => {
    saveStage(id)
    setStageId(id)
    setQuery({ stage: id ? String(id) : null })
  }

  const load = useCallback(
    async (raw: string, opts: { keepEdits?: boolean } = {}): Promise<AvSessionDetail | null> => {
      const code = raw.trim().toUpperCase()
      if (!code) return null
      setLoadingCode(code)
      setSessionError(null)
      try {
        const res = await avFetch(`/api/av/session/${encodeURIComponent(code)}/`, { cache: 'no-store' })
        const body = await res.json()
        if (!body.success) throw new Error(body.error)
        ready.current.clear()
        if (body.data.code !== session?.code && !opts.keepEdits) {
          // Another session: its edits (and the shared-edit URL params) do not carry over.
          setEdits(null)
          setQuery({ code, title: null, speakers: null })
        } else if (router.query.code !== code) setQuery({ code })
        setSession(body.data)
        setNonce(Date.now())
        return body.data as AvSessionDetail
      } catch (e) {
        setSessionError(e instanceof Error ? e.message : String(e))
        return null
      } finally {
        setLoadingCode(null)
      }
    },
    [router, setQuery, session?.code]
  )

  // Deep link: /av/?code=ABC123 (what the URL shows once a session is open),
  // plus &title=…&speakers=CODE,CODE when it shares a hand edit.
  useEffect(() => {
    if (!router.isReady) return
    const code = typeof router.query.code === 'string' ? router.query.code : ''
    const title = typeof router.query.title === 'string' ? router.query.title.trim() : ''
    const codes = typeof router.query.speakers === 'string' ? router.query.speakers.split(',').filter(Boolean) : null
    if (!code || code.toUpperCase() === session?.code) return
    ;(async () => {
      const opened = await load(code, { keepEdits: true })
      if (!opened || (!title && !codes)) return
      let speakers = opened.speakerList
      if (codes) {
        const res = await avFetch('/api/av/speakers/')
          .then(r => r.json())
          .catch(() => null)
        const official = new Map<string, AvSpeaker>((res?.data ?? []).map((s: AvSpeaker) => [s.code, s]))
        speakers = codes.map(c => official.get(c.toUpperCase())).filter((s): s is AvSpeaker => Boolean(s))
        if (speakers.length < codes.length)
          setSessionError('The shared edit names a speaker who is no longer on the official list; left out.')
      }
      setEdits({ title: title || opened.title, speakers })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady])

  /** Apply (or drop) hand edits, and keep them in the URL so the page link shares them. */
  const applyEdits = useCallback(
    (next: CardEdits | null) => {
      setEdits(next)
      setQuery({ title: next?.title ?? null, speakers: next ? next.speakers.map(s => s.code).join(',') : null })
    },
    [setQuery]
  )

  const stage = setup?.stages.find(s => s.id === stageId) ?? null
  const daySessions = useMemo(
    () => (stageSessions ?? []).filter(s => s.start && dayOf(s.start) === day),
    [stageSessions, day]
  )
  const nowMs = now?.getTime() ?? 0
  const nextCode = daySessions.find(s => s.start && Date.parse(s.start) > nowMs)?.code

  const onReady = useCallback((key: string, loaded: Loaded | null) => {
    if (loaded) ready.current.set(key, loaded)
    else ready.current.delete(key)
  }, [])

  const assets = useMemo(() => {
    if (!session) return { youtube: [] as Asset[], social: [] as Asset[], screens: [] as Asset[] }
    const code = encodeURIComponent(session.code)
    const q = editsQuery(edits)
    return {
      youtube: [
        {
          key: 'youtube',
          label: '1920 × 1080',
          url: `/api/av/card/${code}/${q}`,
          ratio: 16 / 9,
          video: { width: 1920, height: 1080 },
        },
      ],
      // No intro animation at these sizes, so no video.
      social: [
        {
          key: 'social',
          label: '1200 × 630 (link preview)',
          url: `/api/av/social-card/${code}/${q}`,
          ratio: 1200 / 630,
        },
        {
          key: 'social-time',
          label: '1200 × 630 (with time and stage)',
          url: `/api/av/social-time-card/${code}/${q}`,
          ratio: 1200 / 630,
        },
        { key: 'story', label: '1080 × 1920 (Instagram Story)', url: `/api/av/story-card/${code}/${q}`, ratio: 9 / 16 },
      ],
      screens: session.screenSizes.map(size => {
        const [w, h] = size.split('x').map(Number)
        return {
          key: `screen-${size}`,
          label: `${w} × ${h}`,
          url: `/api/av/screen-card/${size}/${code}/${q}`,
          ratio: w / h,
          video: { width: w, height: h },
        }
      }),
    }
  }, [session, edits])

  const downloadAll = async () => {
    for (const { objectUrl, fileName } of ready.current.values()) {
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = fileName
      a.click()
      // Browsers drop rapid back-to-back downloads; space them out.
      await new Promise(r => setTimeout(r, 400))
    }
  }

  return (
    <>
      <Head>
        <title>AV assets</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="min-h-screen bg-[#f7f5fb] px-4 py-8 text-[#160b2b]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">AV assets</h1>
              <p className="text-sm text-[#5b5370]">
                Cards and slides for one session, made fresh from Pretalx for last-minute changes. Same sizes and file
                names as the AV Drive, plus what each file is and its resolution. Times in IST.
              </p>
            </div>
            <button type="button" onClick={onLogout} className={BUTTON}>
              <LogOut className="size-4" />
              Log out
            </button>
          </header>

          {setupError && <p className={`${CARD} text-sm text-red-700`}>{setupError}</p>}
          {!setup && !setupError && (
            <p className={`${CARD} flex items-center gap-2 text-sm text-[#5b5370]`}>
              <Loader2 className="size-4 animate-spin" /> Loading stages…
            </p>
          )}

          {setup && !stage && (
            <section className={`${CARD} flex flex-col gap-3`}>
              <h2 className="text-lg font-bold">Pick your stage</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {setup.stages.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickStage(s.id)}
                    className="rounded-xl border border-solid border-[#e5e1ed] bg-[#f7f5fb] px-4 py-3 text-left font-semibold hover:border-[#7235ed]"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {setup && stage && (
            <section className={`${CARD} flex flex-col gap-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[#7235ed] px-4 py-1.5 text-lg font-bold text-white">{stage.name}</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={BUTTON} onClick={() => loadStage(stage.id)}>
                    <RefreshCw className="size-4" />
                    Refresh
                  </button>
                  <button type="button" className={BUTTON} onClick={() => pickStage(null)}>
                    Change stage
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {setup.days.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      d === day
                        ? 'bg-[#160b2b] text-white'
                        : 'border border-solid border-[#e5e1ed] bg-white hover:border-[#7235ed]'
                    }`}
                  >
                    Day {i + 1} · {dayLabel(d)}
                  </button>
                ))}
              </div>

              {stageError && <p className="text-sm text-red-700">{stageError}</p>}
              {!stageSessions && !stageError && (
                <p className="flex items-center gap-2 text-sm text-[#5b5370]">
                  <Loader2 className="size-4 animate-spin" /> Loading talks…
                </p>
              )}
              {stageSessions && daySessions.length === 0 && (
                <p className="text-sm text-[#5b5370]">No talks on {stage.name} that day.</p>
              )}
              {daySessions.length > 0 && (
                <ul className="flex flex-col divide-y divide-[#e5e1ed] overflow-hidden rounded-xl border border-solid border-[#e5e1ed]">
                  {daySessions.map(s => {
                    const live = s.start && s.end && Date.parse(s.start) <= nowMs && nowMs < Date.parse(s.end)
                    const selected = session?.code === s.code
                    return (
                      <li key={s.code}>
                        <button
                          type="button"
                          onClick={() => load(s.code)}
                          className={`flex w-full items-start gap-4 px-4 py-3 text-left hover:bg-[#f7f5fb] ${
                            selected ? 'bg-[#efe8fd]' : ''
                          }`}
                        >
                          <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
                            {clock(s.start)}–{clock(s.end)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-semibold">{s.title}</span>
                            <span className="text-xs text-[#5b5370]">
                              {s.speakers.join(', ') || 'no speaker'} · {s.code}
                            </span>
                          </span>
                          {live && (
                            <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                              Now
                            </span>
                          )}
                          {!live && s.code === nextCode && (
                            <span className="shrink-0 rounded-full bg-[#160b2b] px-2 py-0.5 text-xs font-bold text-white">
                              Next
                            </span>
                          )}
                          {loadingCode === s.code && <Loader2 className="size-4 shrink-0 animate-spin" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={e => {
              e.preventDefault()
              load(codeInput)
            }}
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-solid border-[#e5e1ed] bg-white px-4 py-2 focus-within:border-[#7235ed]">
              <Search className="size-4 shrink-0 text-[#5b5370]" />
              <input
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                placeholder="Or open any session by its code"
                className="min-w-0 flex-1 bg-transparent text-sm uppercase outline-none placeholder:normal-case"
              />
            </label>
            <button type="submit" className={BUTTON} disabled={!codeInput.trim() || Boolean(loadingCode)}>
              {loadingCode && !daySessions.some(s => s.code === loadingCode) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Open
            </button>
          </form>
          {sessionError && <p className="text-sm text-red-700">{sessionError}</p>}

          {session && (
            <>
              <section className={`${CARD} flex flex-wrap items-start justify-between gap-4`}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7235ed]">
                    {session.code} · {session.track || session.type}
                  </p>
                  <h2 className="text-xl font-bold">
                    {edits?.title ?? session.title}
                    {edits && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-semibold text-amber-900">
                        Edited
                      </span>
                    )}
                  </h2>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-[#7235ed] px-3 py-1 font-semibold text-white">
                      {session.room ?? 'No stage yet'}
                    </span>
                    <span className="font-semibold">{when(session.start)}</span>
                  </p>
                  <p className="mt-1 text-sm text-[#5b5370]">
                    {(edits ? edits.speakers.map(s => s.name) : session.speakers).join(', ') || 'no speaker'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={BUTTON}
                    onClick={() => load(session.code)}
                    disabled={Boolean(loadingCode)}
                  >
                    {loadingCode ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Regenerate
                  </button>
                  <button type="button" className={BUTTON} onClick={downloadAll}>
                    <Download className="size-4" />
                    Download all
                  </button>
                </div>
              </section>

              <Section
                title="Edit the cards"
                note={
                  edits
                    ? 'The cards below use your title and speakers. Nothing is saved anywhere: Pretalx and the AV Drive keep the old ones until Pretalx is fixed.'
                    : 'Fix the title or the speakers on the cards below when Pretalx is not up to date yet. Only the files made on this page change; nothing is saved to Pretalx.'
                }
              >
                <CardEditor
                  key={`${session.code}${editsQuery(edits)}`}
                  session={session}
                  applied={edits}
                  onApply={applyEdits}
                />
                {edits && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f7f5fb] px-4 py-3 text-sm">
                    <span className="text-[#5b5370]">
                      The page link now carries this edit: anyone opening it gets the same cards.
                    </span>
                    <CopyButton text={() => window.location.href} label="Copy share link" />
                  </div>
                )}
              </Section>

              <Section
                title="Screen Cards"
                note={
                  assets.screens.length === 0
                    ? `${session.room ?? 'This session'} has no stage screen, so no Screen Card.`
                    : `At the native size of each screen in ${session.room}.`
                }
              >
                {assets.screens.length > 0 && (
                  <div className={GRID}>
                    {assets.screens.map(a => (
                      <AssetTile key={a.key} asset={a} nonce={nonce} onReady={onReady} />
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Slides">
                {session.slides.presenting === 'laptop' ? (
                  <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    <Laptop className="size-5 shrink-0" /> Own laptop: the speaker presents from their own laptop.
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-sm">
                    <Presentation className="size-5 shrink-0 text-[#7235ed]" />
                    {session.slides.label}
                    {session.slides.presenting === null && (
                      <span className="text-[#5b5370]">(the speaker has not said how they present)</span>
                    )}
                  </p>
                )}
                {session.slides.url ? (
                  <div className="flex flex-wrap gap-2">
                    <a href={session.slides.url} target="_blank" rel="noreferrer" className={BUTTON}>
                      <ExternalLink className="size-4" />
                      Open the deck
                    </a>
                    <CopyButton text={session.slides.url} />
                  </div>
                ) : (
                  <p className="text-sm text-[#5b5370]">No deck link in Pretalx.</p>
                )}
                {session.slides.untouched && session.slides.presenting !== 'laptop' && (
                  <p className="text-sm text-amber-800">The deck has never been edited.</p>
                )}
              </Section>

              <Section title="YouTube Card">
                <div className={GRID}>
                  {assets.youtube.map(a => (
                    <AssetTile key={a.key} asset={a} nonce={nonce} onReady={onReady} />
                  ))}
                </div>
              </Section>

              <Section
                title="Social Cards"
                note="Link-preview cards for X, LinkedIn, Telegram and Farcaster posts (plain, or with the day, time and stage), and a portrait Instagram Story that keeps clear of Instagram's own bars."
              >
                <div className={`${GRID} items-start`}>
                  {assets.social.map(a => (
                    <AssetTile key={a.key} asset={a} nonce={nonce} onReady={onReady} />
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </main>
    </>
  )
}

/**
 * The AV crew's password, checked server-side before the tool shows (a stage
 * list request: 200 is in, 401 is a wrong password). Kept on this device
 * until Log out, like the tickets admin.
 */
export default function AvPage() {
  const [status, setStatus] = useState<'checking' | 'login' | 'in'>('checking')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const check = useCallback(async (key: string): Promise<'in' | 'wrong' | 'error'> => {
    try {
      const res = await fetch('/api/av/stages/', { headers: { 'x-admin-key': key }, cache: 'no-store' })
      return res.ok ? 'in' : res.status === 401 ? 'wrong' : 'error'
    } catch {
      return 'error'
    }
  }, [])

  useEffect(() => {
    const stored = readStoredPassword(AV_PASSWORD_KEY)
    if (!stored) return setStatus('login')
    check(stored).then(result => {
      if (result === 'wrong') clearStoredPassword(AV_PASSWORD_KEY)
      // A Pretalx hiccup is not a wrong password: let the tool show its own error.
      setStatus(result === 'wrong' ? 'login' : 'in')
    })
  }, [check])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    setError(null)
    const result = await check(password)
    setBusy(false)
    if (result === 'wrong') return setError('Wrong password')
    if (result === 'error') return setError('Could not check the password, try again')
    storePassword(AV_PASSWORD_KEY, password)
    setPassword('')
    setStatus('in')
  }

  const logout = () => {
    clearStoredPassword(AV_PASSWORD_KEY)
    setStatus('login')
  }

  if (status === 'in') return <AvTool onLogout={logout} />
  return (
    <>
      <Head>
        <title>AV assets</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5fb] px-4 py-8 text-[#160b2b]">
        {status === 'checking' ? (
          <Loader2 className="size-6 animate-spin text-[#7235ed]" />
        ) : (
          <form onSubmit={login} className={`${CARD} flex w-full max-w-sm flex-col gap-4`}>
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-[#7235ed]" />
              <h1 className="text-xl font-bold">AV assets</h1>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>Password</span>
              <span className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  className={`${FIELD} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-[#5b5370] hover:text-[#7235ed]"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy || !password} className={`${PRIMARY_BUTTON} justify-center`}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Log in
            </button>
            <p className="text-xs text-[#5b5370]">The AV crew password. Ask the AV lead if you do not have it.</p>
          </form>
        )}
      </main>
    </>
  )
}
