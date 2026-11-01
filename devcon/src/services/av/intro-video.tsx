/**
 * Talk intro videos for the AV page, rendered in the operator's browser with
 * Remotion's web renderer: the Devcon 8 intro animation plays and its
 * transparent iris opens onto the talk's card, which then holds. The same
 * composition as the nightly intro renderer (github.com/streamethorg/devcon-animation,
 * src/TalkIntro.tsx), with two changes: each screen size uses the animation
 * master made for it (public/av/intro/), and the card under it is the card
 * this page made for that size (fresh from Pretalx, hand edits included)
 * instead of the 1920x1080 card cropped to fit.
 *
 * The masters are the animation's QuickTime RLE (sRGB, alpha) files as VP9
 * with alpha, in the av-assets bucket on Supabase (intro-videos.json has the
 * links): served by its CDN with a one-year cache, so a devcon.org deploy
 * neither purges them nor changes their URL. A changed master gets a new file
 * name. Their colour tags matter: untagged, ffmpeg converts with BT.601 while
 * Chrome decodes with BT.709, a visible colour shift. Encoded per size with:
 *
 *   ffmpeg -i <master>.mov -map 0:v -map 0:a \
 *     -vf scale=out_color_matrix=bt709:out_range=tv,format=yuva420p \
 *     -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv \
 *     -c:v libvpx-vp9 -crf 12 -b:v 0 -deadline good -cpu-used 1 -row-mt 1 -auto-alt-ref 0 \
 *     -c:a libopus -b:a 256k intro-<w>x<h>.webm
 *
 * The page downloads the master first (prefetchIntro, with progress) and
 * renders from the local copy, so the render never waits on the network:
 * Remotion otherwise gives up when a frame's media is not there in time,
 * which is what venue wifi and a 20 MB file produced.
 *
 * Loaded only when an operator asks for a video, so Remotion stays out of the
 * page's first load.
 */
import React from 'react'
import { AbsoluteFill, Img, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { Video } from '@remotion/media'
import { canRenderMediaOnWeb, renderMediaOnWeb } from '@remotion/web-renderer'
import intros from './intro-videos.json'

const FPS = 30
/** Seconds the card stays up after the iris has fully opened. */
const HOLD_SECONDS = 5
/** Remotion's default is 30 s; the master is local by then, but a slow laptop decoding 4032x1512 deserves the room. */
const DELAY_RENDER_TIMEOUT_MS = 120_000

type IntroMeta = { file: string; durationInSeconds: number; revealStart: number; revealEnd: number }

export function introFor(width: number, height: number): IntroMeta | null {
  return (intros as Record<string, IntroMeta>)[`${width}x${height}`] ?? null
}

/**
 * The master for this size as a blob URL, downloaded once per page life (a
 * second video at the same size starts at once). Progress is bytes received
 * over the total, 0 to 1. Fails with a readable message; a failed download is
 * not kept, the next click tries again.
 */
const masters = new Map<string, Promise<string>>()

export function prefetchIntro(width: number, height: number, onProgress: (progress: number) => void): Promise<string> {
  const meta = introFor(width, height)
  if (!meta) return Promise.reject(new Error(`no intro animation for ${width}x${height}`))
  const key = `${width}x${height}`
  const cached = masters.get(key)
  if (cached) {
    onProgress(1)
    return cached
  }
  const download = (async () => {
    let res: Response
    try {
      res = await fetch(meta.file)
    } catch {
      throw new Error('could not download the intro animation: no connection to the file store')
    }
    if (!res.ok || !res.body) throw new Error(`could not download the intro animation: HTTP ${res.status}`)
    const total = Number(res.headers.get('content-length') || 0)
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.byteLength
      if (total > 0) onProgress(Math.min(1, received / total))
    }
    onProgress(1)
    return URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'video/webm' }))
  })()
  masters.set(key, download)
  download.catch(() => masters.delete(key))
  return download
}

type Props = { card: string; intro: string; revealStart: number; introFrames: number }

const TalkIntro: React.FC<Props> = ({ card, intro, revealStart, introFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // The card switches on under the intro the moment the iris starts to open,
  // so the opening shows the card, never black (the intro has a few
  // transparent edge pixels before that).
  const cardOpacity = frame / fps >= revealStart ? 1 : 0
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <AbsoluteFill style={{ opacity: cardOpacity }}>
        <Img src={card} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      {/* Only for the clip's length: a video otherwise holds its last frame over the card. */}
      <Sequence durationInFrames={introFrames}>
        <Video src={intro} objectFit="cover" style={{ width: '100%', height: '100%' }} />
      </Sequence>
    </AbsoluteFill>
  )
}

/**
 * Render the intro over `card` (a URL the page can load, e.g. the card's blob
 * URL) at width x height, as an H.264 mp4. `intro` is the master's blob URL
 * from prefetchIntro (its CDN URL when not given). Throws with a readable
 * message when this browser cannot do it.
 */
export async function renderIntroVideo(opts: {
  card: string
  intro?: string
  width: number
  height: number
  onProgress: (progress: number) => void
  signal?: AbortSignal
}): Promise<Blob> {
  const meta = introFor(opts.width, opts.height)
  if (!meta) throw new Error(`no intro animation for ${opts.width}x${opts.height}`)
  const durationInFrames = Math.ceil(Math.max(meta.durationInSeconds, meta.revealEnd + HOLD_SECONDS) * FPS)
  const props: Props = {
    card: opts.card,
    intro: opts.intro ?? meta.file,
    revealStart: meta.revealStart,
    introFrames: Math.ceil(meta.durationInSeconds * FPS),
  }
  const composition = {
    id: 'TalkIntro',
    defaultProps: props,
    component: TalkIntro,
    fps: FPS,
    width: opts.width,
    height: opts.height,
    durationInFrames,
  }

  const check = await canRenderMediaOnWeb({
    container: 'mp4',
    videoCodec: 'h264',
    width: opts.width,
    height: opts.height,
  })
  if (!check.canRender) {
    throw new Error(
      `This browser cannot render the video (${check.issues.map(i => i.message).join('; ')}). Use a recent Chrome.`
    )
  }

  const result = await renderMediaOnWeb({
    composition,
    inputProps: props,
    container: 'mp4',
    videoCodec: 'h264',
    // These play on LED walls and get re-encoded by YouTube: spend the bits.
    // 0.6 bit per pixel per frame (target ~37 Mbit/s at 1080p, ~16 measured
    // since the card hold is static) is where measured quality levels off:
    // 0.3 loses ~1.5 dB on the animation, 1.0 gains only ~0.6 dB more.
    videoBitrate: Math.round(opts.width * opts.height * FPS * 0.6),
    // AAC at 320 kbit/s (Remotion's default is 128).
    audioBitrate: 320_000,
    // The Ethereum Foundation is a non-profit: Remotion's free license.
    licenseKey: 'free-license',
    delayRenderTimeoutInMilliseconds: DELAY_RENDER_TIMEOUT_MS,
    signal: opts.signal ?? null,
    onProgress: p => opts.onProgress(p.progress),
  })
  return result.getBlob()
}
