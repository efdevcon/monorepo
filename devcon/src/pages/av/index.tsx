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
  ChevronDown,
  ChevronLeft,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  X,
} from 'lucide-react'
import { AV_TIMEZONE, screenSizesFor } from 'services/av/av-assets'
import introVideos from 'services/av/intro-videos.json'
import type { AvSessionDetail, AvSessionSummary, AvSpeaker, AvStage, AvStoredVideo } from 'services/av/pretalx'
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
  /** The card route, without a query: the session data hash and the edits ride on the tile's `params`. */
  url: string
  /** Width / height, for the preview box. */
  ratio: number
  /** Kind and pixel size, when a stream intro can be made from this card. */
  video?: { kind: 'YouTube' | 'Screen'; width: number; height: number }
}

interface Loaded {
  objectUrl: string
  fileName: string
  bytes: number
  /** CDN links when the card is kept in storage (services/av/render.ts, stored mode). */
  jpegUrl?: string
  pngUrl?: string
}

/** A render that has not answered by then is given up on the page; the server's own limit is close behind. */
const RENDER_TIMEOUT_MS = 45_000

class ExpiredInputsError extends Error {}

/** What an operator reads when a fetch fails: the cause, and that Retry is the move. */
function describeFetchError(e: unknown, what: string): string {
  if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError'))
    return `${what} took more than ${RENDER_TIMEOUT_MS / 1000} s and was given up: the server is slow right now. Retry in a moment.`
  if (e instanceof TypeError) return `${what} did not reach the server (network). Retry.`
  return e instanceof Error ? e.message : String(e)
}

/**
 * One card. With the session data hash (`stored`), the route renders into
 * storage once and answers CDN links; the JPEG is then fetched from the CDN
 * for the preview and the download (same bytes, the Drive file name). Without
 * it (storage was down when the session opened) the route answers the image
 * itself, the slow way.
 */
async function loadCard(asset: Asset, params: string, stored: boolean, nonce: number): Promise<Loaded> {
  const url = `${asset.url}?${params}${params ? '&' : ''}t=${nonce}`
  const res = await avFetch(url, { cache: 'no-store', signal: AbortSignal.timeout(RENDER_TIMEOUT_MS) })
  if (res.status === 410) throw new ExpiredInputsError('expired')
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || `HTTP ${res.status}`)
  }
  if (!stored) {
    const blob = await res.blob()
    return { objectUrl: URL.createObjectURL(blob), fileName: fileNameOf(res, `${asset.key}.jpg`), bytes: blob.size }
  }
  const body = await res.json()
  if (!body?.success) throw new Error(body?.error || 'render failed')
  const data = body.data as { png: string; jpeg: string; fileName: string }
  const image = await fetch(data.jpeg, { signal: AbortSignal.timeout(30_000) })
  if (!image.ok) throw new Error(`the stored card could not be fetched (HTTP ${image.status})`)
  const blob = await image.blob()
  return {
    objectUrl: URL.createObjectURL(blob),
    fileName: data.fileName,
    bytes: blob.size,
    jpegUrl: data.jpeg,
    pngUrl: data.png,
  }
}

/** One asset: previewed and downloaded from the same bytes, with its CDN link and a Retry when it failed. */
function AssetTile({
  asset,
  params,
  stored,
  code,
  videos,
  nonce,
  retryAll,
  onReady,
  onExpired,
}: {
  asset: Asset
  params: string
  stored: boolean
  code: string
  /** The session's stream intros by `<Kind>-<w>x<h>`, as the session route found them in storage. */
  videos?: Record<string, AvStoredVideo>
  nonce: number
  /** Bumped by the page's "Retry failed": only a tile in error tries again. */
  retryAll: number
  onReady: (key: string, loaded: Loaded | null) => void
  /** The stored session data is gone (410): the page opens the session again. */
  onExpired: () => void
}) {
  const [state, setState] = useState<{ loaded?: Loaded; error?: string; loading: boolean }>({ loading: true })
  const [attempt, setAttempt] = useState(0)
  const retrySeen = useRef(retryAll)
  useEffect(() => {
    if (retryAll === retrySeen.current) return
    retrySeen.current = retryAll
    if (state.error) setAttempt(a => a + 1)
  }, [retryAll, state.error])

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setState({ loading: true })
    onReady(asset.key, null)
    loadCard(asset, params, stored, nonce)
      .then(loaded => {
        if (cancelled) return URL.revokeObjectURL(loaded.objectUrl)
        objectUrl = loaded.objectUrl
        setState({ loaded, loading: false })
        onReady(asset.key, loaded)
      })
      .catch(e => {
        if (cancelled) return
        if (e instanceof ExpiredInputsError) {
          setState({ error: 'The session data behind this page expired; reloading the session.', loading: false })
          onExpired()
          return
        }
        setState({ error: describeFetchError(e, 'The render'), loading: false })
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- asset by key and url, not identity
  }, [asset.key, asset.url, params, stored, nonce, attempt, onReady, onExpired])

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
          <div className="flex flex-col items-center gap-2 px-3 text-center text-sm text-red-700">
            <p>
              <AlertTriangle className="mb-1 inline size-4" /> {state.error}
            </p>
            <button type="button" className={BUTTON} onClick={() => setAttempt(a => a + 1)}>
              <RotateCcw className="size-4" />
              Retry
            </button>
          </div>
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
            {state.loaded.jpegUrl && <CopyButton text={state.loaded.jpegUrl} />}
          </div>
          {asset.video && hasIntro(asset.video.width, asset.video.height) && (
            <IntroVideoButton
              card={state.loaded}
              source={`${asset.url}?${params}`}
              code={code}
              stored={videos?.[`${asset.video.kind}-${asset.video.width}x${asset.video.height}`]}
              {...asset.video}
            />
          )}
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
 * Send a rendered stream intro to the av-assets bucket: a signed one-time
 * URL from our API, then the file goes from this browser straight to
 * Supabase (a function could not carry it). The object is the session's one
 * for that kind and size, overwritten. Resolves to the public link, stamped
 * with the upload time so the new version is never read from a stale cache.
 */
async function uploadVideo(
  code: string,
  kind: 'YouTube' | 'Screen',
  width: number,
  height: number,
  /** The stored PNG the video was rendered from: recorded next to the video, so the page can tell a current one from an outdated one. */
  card: string | undefined,
  blob: Blob,
  onProgress: (progress: number) => void
): Promise<string> {
  const res = await avFetch('/api/av/upload-url/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, kind, width, height }),
    signal: AbortSignal.timeout(20_000),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success) throw new Error(body?.error || `upload URL: HTTP ${res.status}`)
  const { uploadUrl, publicUrl, headers } = body.data as {
    uploadUrl: string
    publicUrl: string
    headers: Record<string, string>
  }
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`the file store answered ${xhr.status}: ${xhr.responseText.slice(0, 140)}`))
    xhr.onerror = () => reject(new Error('network error during the upload'))
    xhr.ontimeout = () => reject(new Error('the upload timed out'))
    xhr.timeout = 10 * 60_000
    xhr.send(blob)
  })
  let savedAt = Date.now()
  if (card) {
    const rec = await avFetch('/api/av/video-saved/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, kind, width, height, card }),
      signal: AbortSignal.timeout(20_000),
    })
    const recBody = await rec.json().catch(() => null)
    if (!rec.ok || !recBody?.success) throw new Error(recBody?.error || `could not record the video (HTTP ${rec.status})`)
    savedAt = recBody.data.savedAt
  }
  return `${publicUrl}?v=${savedAt}`
}

/** A deploy while the page was open: the chunk this click needs is gone from the CDN. */
const isChunkLoadError = (e: unknown) =>
  /ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch dynamically/i.test(
    String((e as Error)?.message ?? e)
  )

/** Warm-up of the video side when the page opens: the renderer chunk and the stage's animation masters. */
interface Warmth {
  total: number
  done: number
  progress: number
  error?: string
}

/**
 * Render the cards of one session into storage without showing them: the
 * stage's next talk is warmed as soon as the page knows it, so opening it
 * finds every card already drawn. Same requests as the tiles make; the
 * answers are dropped. Quiet on every failure (the tiles will say).
 */
async function warmCards(code: string): Promise<void> {
  const res = await avFetch(`/api/av/session/${encodeURIComponent(code)}/`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
  })
  const body = await res.json().catch(() => null)
  const detail = body?.success ? (body.data as AvSessionDetail) : null
  if (!detail?.inputs) return
  const params = cardParams(null, detail.inputs)
  const routes = [
    `/api/av/card/${encodeURIComponent(code)}/`,
    `/api/av/social-card/${encodeURIComponent(code)}/`,
    `/api/av/social-time-card/${encodeURIComponent(code)}/`,
    `/api/av/story-card/${encodeURIComponent(code)}/`,
    ...detail.screenSizes.map(size => `/api/av/screen-card/${size}/${encodeURIComponent(code)}/`),
  ]
  await Promise.allSettled(
    routes.map(url => avFetch(`${url}?${params}&t=warm`, { cache: 'no-store', signal: AbortSignal.timeout(RENDER_TIMEOUT_MS) }))
  )
}

type VideoUpload =
  | { status: 'uploading'; progress: number }
  | { status: 'done'; link: string }
  | { status: 'error'; message: string }

type VideoState =
  | { phase: 'idle'; error?: { message: string; reload?: boolean } }
  /** A stream intro rendered earlier from this very card is in the bucket: shown as is, with its link. */
  | { phase: 'existing'; url: string; storedAt: number; downloading?: boolean; error?: string }
  /** A stream intro is in the bucket but was made from another version of the card: not shown. */
  | { phase: 'outdated'; savedAt: number }
  | { phase: 'working'; step: 'animation' | 'card' | 'render'; progress: number }
  | { phase: 'done'; url: string; blob: Blob; upload: VideoUpload }

const STEP_LABEL: Record<'animation' | 'card' | 'render', string> = {
  animation: 'Animation',
  card: 'Card',
  render: 'Rendering',
}

/**
 * Renders the intro animation over this card in the browser, downloads the
 * mp4 when it is ready, plays it inline and sends it to the file store for a
 * link. Remotion loads on the first click only (preloaded in the background
 * once the page is up, see AvTool). In order: the animation master (from the
 * CDN, cached for the page's life), the card's lossless PNG (the stored one,
 * so nothing is rendered twice; the JPEG preview is compressed once by the
 * video encoder instead of twice), then the render. Each step reports its
 * own progress, so a stall is seen for what it is.
 */
function IntroVideoButton({
  card,
  source,
  code,
  kind,
  width,
  height,
  stored,
}: {
  card: Loaded
  /** The card route with its params, for the PNG when the card is not in storage. */
  source: string
  code: string
  kind: 'YouTube' | 'Screen'
  width: number
  height: number
  /** This stream intro in storage, as found when the session opened. */
  stored?: AvStoredVideo
}) {
  const [state, setState] = useState<VideoState>({ phase: 'idle' })
  const fileName = card.fileName.replace(/ - (YouTube|Screen) /, ' - Intro $1 ').replace(/\.jpg$/i, '.mp4')
  const urlRef = useRef<string | null>(null)

  // A new card (regenerated, edited) makes a video rendered on this page
  // stale. The bucket's copy is the latest one anyone rendered, and its
  // record names the card it was made from (read by the session route): it
  // is shown only when that is the card on screen now. Any other saved video
  // is outdated and stays hidden until remade.
  useEffect(() => {
    if (!stored?.exists) return setState({ phase: 'idle' })
    if (stored.card && card.pngUrl && stored.card === card.pngUrl) {
      const stamp = stored.savedAt || Date.now()
      setState({ phase: 'existing', url: `${stored.url}?v=${stamp}`, storedAt: stamp })
    } else setState({ phase: 'outdated', savedAt: stored.savedAt || Date.now() })
  }, [card.objectUrl, card.pngUrl, stored])
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    []
  )

  const upload = async (blob: Blob) => {
    const patch = (upload: VideoUpload) => setState(s => (s.phase === 'done' && s.blob === blob ? { ...s, upload } : s))
    try {
      const link = await uploadVideo(code, kind, width, height, card.pngUrl, blob, progress =>
        patch({ status: 'uploading', progress })
      )
      patch({ status: 'done', link })
    } catch (e) {
      patch({ status: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  /** The bucket's copy, saved under the Drive file name (a cross-origin link cannot name its download). */
  const downloadExisting = async (url: string) => {
    setState(s => (s.phase === 'existing' ? { ...s, downloading: true, error: undefined } : s))
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const objectUrl = URL.createObjectURL(await res.blob())
      saveBlob(objectUrl, fileName)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      setState(s => (s.phase === 'existing' ? { ...s, downloading: false } : s))
    } catch (e) {
      setState(s =>
        s.phase === 'existing'
          ? { ...s, downloading: false, error: `could not fetch the video (${e instanceof Error ? e.message : String(e)})` }
          : s
      )
    }
  }

  const generate = async () => {
    setState({ phase: 'working', step: 'animation', progress: 0 })
    let png: string | null = null
    try {
      const mod = await import('services/av/intro-video').catch(e => {
        if (isChunkLoadError(e)) throw Object.assign(new Error('chunk'), { reload: true })
        throw e
      })
      const intro = await mod.prefetchIntro(width, height, progress =>
        setState(s => (s.phase === 'working' ? { phase: 'working', step: 'animation', progress } : s))
      )
      setState({ phase: 'working', step: 'card', progress: 0 })
      const res = card.pngUrl
        ? await fetch(card.pngUrl, { signal: AbortSignal.timeout(30_000) })
        : await avFetch(`${source}${source.includes('?') ? '&' : '?'}format=png`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
          })
      if (!res.ok) throw new Error(`the card's PNG could not be fetched (HTTP ${res.status})`)
      png = URL.createObjectURL(await res.blob())
      setState({ phase: 'working', step: 'render', progress: 0 })
      const blob = await mod.renderIntroVideo({
        card: png,
        intro,
        width,
        height,
        onProgress: progress =>
          setState(s => (s.phase === 'working' ? { phase: 'working', step: 'render', progress } : s)),
      })
      const url = URL.createObjectURL(blob)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = url
      // Shown and saved to the file store; the operator downloads it when they want it.
      setState({ phase: 'done', url, blob, upload: { status: 'uploading', progress: 0 } })
      void upload(blob)
    } catch (e) {
      if ((e as { reload?: boolean })?.reload)
        setState({
          phase: 'idle',
          error: {
            message: 'The site was updated while this page was open, so the stream intro renderer could not load. Reload the page and try again (the edits are kept in the link).',
            reload: true,
          },
        })
      else setState({ phase: 'idle', error: { message: describeFetchError(e, 'The video') } })
    } finally {
      if (png) URL.revokeObjectURL(png)
    }
  }

  // One panel whatever the state: what this is, where it stands, what to do next.
  const upload_ = state.phase === 'done' ? state.upload : null
  const status: { label: string; tone: 'muted' | 'busy' | 'ok' | 'warn' } =
    state.phase === 'existing'
      ? { label: `Saved ${whenFormat.format(new Date(state.storedAt))}`, tone: 'ok' }
      : state.phase === 'done'
      ? upload_?.status === 'done'
        ? { label: 'Just made, saved', tone: 'ok' }
        : upload_?.status === 'uploading'
        ? { label: 'Just made, saving', tone: 'busy' }
        : { label: 'Just made, not saved', tone: 'warn' }
      : state.phase === 'working'
      ? { label: `${STEP_LABEL[state.step]} ${Math.round(state.progress * 100)}%`, tone: 'busy' }
      : state.phase === 'outdated'
      ? { label: 'Outdated', tone: 'warn' }
      : state.error
      ? { label: 'Failed', tone: 'warn' }
      : { label: 'Not made yet', tone: 'muted' }
  const chip = {
    muted: 'bg-[#efecf5] text-[#5b5370]',
    busy: 'bg-[#efe8fd] text-[#5f26d4]',
    ok: 'bg-green-100 text-green-800',
    warn: 'bg-amber-100 text-amber-900',
  }[status.tone]
  const playsOn = kind === 'YouTube' ? 'the stream' : 'the stage screen'
  // A saved video (CDN) fetches nothing until Play is pressed; a just-rendered one is a local blob.
  const preview = (url: string, local: boolean) => (
    <video
      controls
      playsInline
      preload={local ? 'metadata' : 'none'}
      src={url}
      className="w-full rounded-lg bg-black"
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  )
  const again = (
    <button
      type="button"
      onClick={generate}
      className={BUTTON}
      title="Render the stream intro again from this card. It replaces the saved one; the link stays the same."
    >
      <Film className="size-4" />
      Make it again
    </button>
  )

  return (
    <div className="mt-1 flex w-full flex-col gap-2 rounded-lg border border-solid border-[#d6d0e3] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
          <Film className="size-4 text-[#7235ed]" />
          Stream intro
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${chip}`} aria-live="polite">
          {status.label}
        </span>
      </div>
      <p className="-mt-1 text-xs text-[#5b5370]">
        8-second mp4, {width} × {height}, for {playsOn}
      </p>

      {state.phase === 'idle' && (
        <p className="text-xs text-[#5b5370]">
          The Devcon 8 intro animation opening onto this card, to play before the talk. Rendered in this browser, then
          saved with a fixed link that always plays the latest version.
        </p>
      )}
      {state.phase === 'outdated' && (
        <p className="text-xs text-amber-900">
          The saved stream intro ({whenFormat.format(new Date(state.savedAt))}) was made from an earlier version of this
          card, so it is not shown. Remake it to replace it; the link stays the same.
        </p>
      )}

      {state.phase === 'working' && (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#efecf5]">
            <div
              className="h-full rounded-full bg-[#7235ed] transition-[width]"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#5b5370]">
            {state.step === 'animation' && 'Downloading the intro animation.'}
            {state.step === 'card' && 'Fetching the card.'}
            {state.step === 'render' && 'Rendering the video in this browser; keep the tab open.'}
          </p>
        </>
      )}

      {state.phase === 'existing' && preview(state.url, false)}
      {state.phase === 'done' && preview(state.url, true)}

      <div className="flex flex-wrap items-center gap-2">
        {(state.phase === 'idle' || state.phase === 'outdated') && (
          <button
            type="button"
            onClick={generate}
            className={PRIMARY_BUTTON}
            title={`The 8-second Devcon 8 intro animation opening onto this card, as a ${width}x${height} mp4 for ${playsOn}. Rendered in this browser.`}
          >
            <Film className="size-4" />
            {state.phase === 'outdated' ? 'Remake stream intro (mp4)' : state.error ? 'Try again' : 'Make stream intro (mp4)'}
          </button>
        )}
        {state.phase === 'idle' && state.error?.reload && (
          <button type="button" className={BUTTON} onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" />
            Reload the page
          </button>
        )}
        {state.phase === 'existing' && (
          <>
            <button
              type="button"
              className={BUTTON}
              disabled={state.downloading}
              onClick={() => void downloadExisting(state.url)}
            >
              {state.downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download video
            </button>
            <CopyButton text={state.url} />
            {again}
          </>
        )}
        {state.phase === 'done' && upload_ && (
          <>
            <a href={state.url} download={fileName} className={BUTTON}>
              <Download className="size-4" />
              Download video
            </a>
            {upload_.status === 'done' && <CopyButton text={upload_.link} />}
            {upload_.status === 'uploading' && (
              <span className={`${BUTTON} relative overflow-hidden`}>
                <span
                  className="absolute inset-y-0 left-0 bg-[#7235ed]/15 transition-[width]"
                  style={{ width: `${Math.round(upload_.progress * 100)}%` }}
                />
                <Loader2 className="relative size-4 animate-spin" />
                <span className="relative tabular-nums">Saving {Math.round(upload_.progress * 100)}%</span>
              </span>
            )}
            {upload_.status === 'error' && (
              <button type="button" className={BUTTON} onClick={() => void upload(state.blob)}>
                <RotateCcw className="size-4" />
                Retry saving
              </button>
            )}
            {again}
          </>
        )}
      </div>

      {state.phase === 'idle' && state.error && <p className="text-xs text-red-700">{state.error.message}</p>}
      {state.phase === 'existing' && state.error && <p className="text-xs text-red-700">{state.error}</p>}
      {state.phase === 'done' && upload_?.status === 'error' && (
        <p className="text-xs text-red-700">
          The video is downloaded on this computer; it could not be saved to the file store: {upload_.message}
        </p>
      )}
    </div>
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

/** What every card request carries: the hand edits and the stored session data's hash (none when storage was down). */
const cardParams = (edits: CardEdits | null, inputs: string | null | undefined): string => {
  const q = new URLSearchParams()
  if (edits) {
    q.set('title', edits.title)
    q.set('speakers', edits.speakers.map(s => s.code).join(','))
  }
  if (inputs) q.set('inputs', inputs)
  return q.toString()
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

/**
 * What the operator typed or pasted into the "open a session" box: a Pretalx
 * code, or a link from the app (app.devcon.org/schedule/<slug>) or devcon.org
 * (devcon.org/schedule/devcon8/<code>/), or a bare slug. A slug is looked up
 * on the server (the app's ids are devcon-api's, not Pretalx's).
 */
function sessionRef(raw: string): { code: string } | { slug: string } | null {
  let segment = raw.trim()
  if (!segment) return null
  if (/^https?:\/\//i.test(segment) || segment.includes('/')) {
    try {
      const url = new URL(/^https?:\/\//i.test(segment) ? segment : `https://${segment}`)
      // Locale, section and event prefixes go; the first segment left is the session.
      const skip = /^(en|hi|mr|schedule|session|sessions|devcon8|devcon-8|sea|av)$/i
      segment = url.pathname.split('/').filter(Boolean).find(p => !skip.test(p)) ?? ''
    } catch {
      return null
    }
  }
  segment = segment.replace(/[?#].*$/, '')
  if (!segment) return null
  if (/^[A-Za-z0-9]{4,12}$/.test(segment)) return { code: segment.toUpperCase() }
  return { slug: segment }
}

/** A session saved in Pretalx this recently is marked in the list and the header: its cards may have changed. */
const EDITED_WINDOW_MS = 10 * 60 * 60 * 1000
const editedRecently = (updated: string | null | undefined, nowMs: number): boolean =>
  Boolean(updated) && nowMs - Date.parse(updated as string) < EDITED_WINDOW_MS

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
  const [retryAll, setRetryAll] = useState(0)
  const [warmth, setWarmth] = useState<Warmth | null>(null)
  const ready = useRef(new Map<string, Loaded>())

  // The video renderer (Remotion) is a separate chunk loaded on the first
  // click. Fetching it once the page is up means a deploy in the meantime
  // cannot take it away from an open page.
  useEffect(() => {
    const t = window.setTimeout(() => void import('services/av/intro-video').catch(() => {}), 1000)
    return () => window.clearTimeout(t)
  }, [])

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
      const ref = sessionRef(raw)
      if (!ref) return null
      let code = 'code' in ref ? ref.code : ''
      const slug = 'slug' in ref ? ref.slug : ''
      setLoadingCode(code || slug)
      setSessionError(null)
      try {
        if (!code) {
          // An app link: its slug becomes the Pretalx code on the server.
          const r = await avFetch(`/api/av/resolve/?id=${encodeURIComponent(slug)}`, { cache: 'no-store' })
          const b = await r.json().catch(() => null)
          if (!b?.success) throw new Error(b?.error || `could not resolve the link (HTTP ${r.status})`)
          code = b.data.code as string
        }
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

  // A tile whose stored session data is gone opens the session again (new data, same edits).
  const openSessionRef = useRef(session)
  openSessionRef.current = session
  const loadRef = useRef(load)
  loadRef.current = load
  const onExpired = useCallback(() => {
    const current = openSessionRef.current
    if (current) void loadRef.current(current.code, { keepEdits: true })
  }, [])

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

  // Warm-up, once the stage is known: the renderer chunk and the animation
  // masters this stage's videos need (its screens plus the YouTube size), so
  // the first video of the day starts rendering at once instead of after a
  // 20 MB download on venue wifi. Progress shows under the stage name.
  useEffect(() => {
    if (!stage) return
    const sizes = [...new Set(['1920x1080', ...screenSizesFor(stage.name)])].filter(s => s in introVideos)
    let cancelled = false
    const per = new Map(sizes.map(s => [s, 0]))
    const report = () => {
      if (cancelled) return
      const values = [...per.values()]
      setWarmth({
        total: sizes.length,
        done: values.filter(v => v >= 1).length,
        progress: sizes.length ? values.reduce((a, b) => a + b, 0) / sizes.length : 1,
      })
    }
    report()
    ;(async () => {
      try {
        const mod = await import('services/av/intro-video')
        await Promise.all(
          sizes.map(async size => {
            const [w, h] = size.split('x').map(Number)
            await mod.prefetchIntro(w, h, p => {
              per.set(size, p)
              report()
            })
            per.set(size, 1)
            report()
          })
        )
      } catch (e) {
        if (cancelled) return
        setWarmth(w => ({
          ...(w ?? { total: sizes.length, done: 0, progress: 0 }),
          error: isChunkLoadError(e)
            ? 'the site was updated since this page loaded; reload it before making videos'
            : 'the animations could not be downloaded now; they will be when a video is made',
        }))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- per stage, not per render of the stage object
  }, [stage?.id])

  // The next talk's cards, drawn into storage ahead of the operator opening it (once per talk).
  const warmed = useRef<string | null>(null)
  useEffect(() => {
    if (!nextCode || warmed.current === nextCode || session?.code === nextCode) return
    warmed.current = nextCode
    void warmCards(nextCode).catch(() => {})
  }, [nextCode, session?.code])

  const onReady = useCallback((key: string, loaded: Loaded | null) => {
    if (loaded) ready.current.set(key, loaded)
    else ready.current.delete(key)
  }, [])

  const assets = useMemo(() => {
    if (!session) return { youtube: [] as Asset[], social: [] as Asset[], screens: [] as Asset[] }
    const code = encodeURIComponent(session.code)
    return {
      youtube: [
        {
          key: 'youtube',
          label: '1920 × 1080',
          url: `/api/av/card/${code}/`,
          ratio: 16 / 9,
          video: { kind: 'YouTube' as const, width: 1920, height: 1080 },
        },
      ],
      // No intro animation at these sizes, so no video.
      social: [
        {
          key: 'social',
          label: '1200 × 630 (link preview)',
          url: `/api/av/social-card/${code}/`,
          ratio: 1200 / 630,
        },
        {
          key: 'social-time',
          label: '1200 × 630 (with time and stage)',
          url: `/api/av/social-time-card/${code}/`,
          ratio: 1200 / 630,
        },
        { key: 'story', label: '1080 × 1920 (Instagram Story)', url: `/api/av/story-card/${code}/`, ratio: 9 / 16 },
      ],
      screens: session.screenSizes.map(size => {
        const [w, h] = size.split('x').map(Number)
        return {
          key: `screen-${size}`,
          label: `${w} × ${h}`,
          url: `/api/av/screen-card/${size}/${code}/`,
          ratio: w / h,
          video: { kind: 'Screen' as const, width: w, height: h },
        }
      }),
    }
  }, [session])
  const params = useMemo(() => cardParams(edits, session?.inputs), [edits, session?.inputs])
  const stored = Boolean(session?.inputs)
  const tile = (a: Asset) =>
    session && (
      <AssetTile
        key={a.key}
        asset={a}
        params={params}
        stored={stored}
        code={session.code}
        videos={session.videos}
        nonce={nonce}
        retryAll={retryAll}
        onReady={onReady}
        onExpired={onExpired}
      />
    )

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
                <button
                  type="button"
                  onClick={() => pickStage(null)}
                  title="Pick another stage"
                  className="inline-flex items-center gap-2 rounded-full bg-[#7235ed] py-1.5 pl-4 pr-3 text-lg font-bold text-white hover:bg-[#5f26d4]"
                >
                  {stage.name}
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                    Change stage
                  </span>
                  <ChevronDown className="size-4" />
                </button>
                <button type="button" className={BUTTON} onClick={() => loadStage(stage.id)}>
                  <RefreshCw className="size-4" />
                  Refresh
                </button>
              </div>

              {warmth && (
                <p className="flex items-center gap-2 text-xs text-[#5b5370]" aria-live="polite">
                  {warmth.error ? (
                    <>
                      <AlertTriangle className="size-3.5 text-amber-700" /> Stream intros: {warmth.error}.
                    </>
                  ) : warmth.done === warmth.total ? (
                    <>
                      <Check className="size-3.5 text-green-700" /> Stream intros ready: the intro animation for{' '}
                      {warmth.total === 1 ? 'this stage’s screen size is' : `this stage’s ${warmth.total} screen sizes are`}{' '}
                      downloaded.
                    </>
                  ) : (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Preparing stream intros: downloading the intro
                      animation, {warmth.done} of {warmth.total} screen sizes, {Math.round(warmth.progress * 100)}%
                    </>
                  )}
                </p>
              )}

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

              {daySessions.some(s => editedRecently(s.updated, nowMs)) && (
                <p className="text-xs text-amber-900">
                  Yellow: saved in Pretalx in the last 10 hours (title, speakers or details may have changed; a
                  schedule move alone does not count). Check their cards.
                </p>
              )}
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
                    const edited = editedRecently(s.updated, nowMs)
                    return (
                      <li key={s.code}>
                        <button
                          type="button"
                          onClick={() => load(s.code)}
                          className={`flex w-full items-start gap-4 px-4 py-3 text-left ${
                            selected
                              ? 'bg-[#efe8fd]'
                              : edited
                              ? 'bg-amber-100 hover:bg-amber-200/70'
                              : 'hover:bg-[#f7f5fb]'
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
                          {edited && (
                            <span
                              className="shrink-0 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-bold text-amber-950"
                              title={`Saved in Pretalx at ${clock(s.updated)}, within the last 10 hours: its cards may have changed.`}
                            >
                              Edited {clock(s.updated)}
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
                placeholder="Or open any session: paste its link from the app or devcon.org, or type its code"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
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
                  {editedRecently(session.updated, nowMs) && (
                    <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                      Saved in Pretalx at {clock(session.updated)}: these cards reflect that edit.
                    </p>
                  )}
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
                  <button
                    type="button"
                    className={BUTTON}
                    onClick={() => setRetryAll(n => n + 1)}
                    title="Try again every card that failed"
                  >
                    <RotateCcw className="size-4" />
                    Retry failed
                  </button>
                  <button type="button" className={BUTTON} onClick={downloadAll}>
                    <Download className="size-4" />
                    Download all
                  </button>
                </div>
                {!stored && (
                  <p className="w-full rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    The file store did not answer when this session opened: the cards render the slow way, with
                    no links to copy. Regenerate in a minute to try again.
                  </p>
                )}
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

              <Section
                title="Screen Cards"
                note={
                  assets.screens.length === 0
                    ? `${session.room ?? 'This session'} has no stage screen, so no Screen Card.`
                    : `At the native size of each screen in ${session.room}. "Make stream intro" renders the 8-second Devcon 8 intro animation opening onto the card, as an mp4 to play on the screen before the talk.`
                }
              >
                {assets.screens.length > 0 && <div className={GRID}>{assets.screens.map(tile)}</div>}
              </Section>

              <Section
                title="YouTube Card"
                note='The thumbnail and the stream’s title frame. "Make stream intro" renders the 8-second Devcon 8 intro animation opening onto it, as an mp4 to play on the stream before the talk.'
              >
                <div className={GRID}>{assets.youtube.map(tile)}</div>
              </Section>

              <Section
                title="Social Cards"
                note="Link-preview cards for X, LinkedIn, Telegram and Farcaster posts (plain, or with the day, time and stage), and a portrait Instagram Story that keeps clear of Instagram's own bars."
              >
                <div className={`${GRID} items-start`}>{assets.social.map(tile)}</div>
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
