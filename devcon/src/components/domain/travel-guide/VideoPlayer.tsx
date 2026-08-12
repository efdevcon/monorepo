import React from 'react'
import Image, { StaticImageData } from 'next/image'
import { Play } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  title: string
  poster?: StaticImageData
  posterAlt?: string
  caption?: React.ReactNode
  className?: string
}

// Poster + play affordance that swaps to a native <video> on click — the same
// click-to-load pattern (and play button) as landing-page/VideoPreview, with a
// self-hosted file instead of a YouTube iframe. The frame is 4:3 to match the
// media, so it fills edge to edge at every breakpoint (no pillarboxing).
export const VideoPlayer = ({ src, title, poster, posterAlt = '', caption, className }: VideoPlayerProps) => {
  const [playing, setPlaying] = React.useState(false)

  return (
    <div className={className}>
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
        {playing ? (
          <video src={src} title={title} autoPlay controls playsInline className="h-full aspect-[4/3] object-contain" />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className="absolute inset-0 flex items-center justify-center cursor-pointer group"
          >
            {poster && (
              <div className="relative h-full aspect-[4/3]">
                <Image src={poster} alt={posterAlt} fill sizes="(max-width: 1080px) 100vw, 660px" className="object-cover" />
              </div>
            )}
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-20 rounded-full bg-[rgba(32,16,63,0.3)] outline outline-1 outline-white/20 backdrop-blur-[6px] flex items-center justify-center group-hover:bg-[rgba(32,16,63,0.5)] transition-colors z-10">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </span>
          </button>
        )}
      </div>
      {caption && <div className="pt-[16px] text-[12px] leading-[16px] text-[#594d73]">{caption}</div>}
    </div>
  )
}
