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
 * with alpha. Their colour tags matter: untagged, ffmpeg converts with
 * BT.601 while Chrome decodes with BT.709, a visible colour shift. Encoded
 * per size with:
 *
 *   ffmpeg -i <master>.mov -map 0:v -map 0:a \
 *     -vf scale=out_color_matrix=bt709:out_range=tv,format=yuva420p \
 *     -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv \
 *     -c:v libvpx-vp9 -crf 12 -b:v 0 -deadline good -cpu-used 1 -row-mt 1 -auto-alt-ref 0 \
 *     -c:a libopus -b:a 256k intro-<w>x<h>.webm
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

type IntroMeta = { file: string; durationInSeconds: number; revealStart: number; revealEnd: number }

export function introFor(width: number, height: number): IntroMeta | null {
  return (intros as Record<string, IntroMeta>)[`${width}x${height}`] ?? null
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
 * URL) at width x height, as an H.264 mp4. Throws with a readable message when
 * this browser cannot do it.
 */
export async function renderIntroVideo(opts: {
  card: string
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
    intro: new URL(meta.file, window.location.origin).href,
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
    signal: opts.signal ?? null,
    onProgress: p => opts.onProgress(p.progress),
  })
  return result.getBlob()
}
