import React from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import type { ConstellationSpeaker } from './types'

interface SpeakerDetailOverlayProps {
  speaker: ConstellationSpeaker | null
  layoutIdPrefix: string
  cardWidth: string | number
  imageHeight: number
  companyLogoHeight: number
  backdropClassName?: string
  backdropStyle: React.CSSProperties
  onDismiss: () => void
}

export function SpeakerDetailOverlay({
  speaker,
  layoutIdPrefix,
  cardWidth,
  imageHeight,
  companyLogoHeight,
  backdropClassName = '',
  backdropStyle,
  onDismiss,
}: SpeakerDetailOverlayProps) {
  return (
    <AnimatePresence>
      {speaker && (
        <>
          <motion.div
            key="backdrop"
            className={`absolute inset-0 z-30 ${backdropClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            style={backdropStyle}
          />
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              layoutId={`${layoutIdPrefix}${speaker.id}`}
              className="pointer-events-auto bg-white rounded-2xl overflow-hidden shadow-xl relative"
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              style={{
                width: cardWidth,
                boxShadow: '0 18px 36px -12px rgba(34, 17, 68, 0.22), 0 6px 14px -8px rgba(34, 17, 68, 0.18)',
                outline: '1px solid rgba(34, 17, 68, 0.08)',
              }}
            >
              <button
                onClick={onDismiss}
                aria-label="Close speaker details"
                className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#1a1a1a] flex items-center justify-center shadow-sm transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <div
                className="relative flex items-center justify-center text-white font-bold overflow-hidden"
                style={{ height: imageHeight, backgroundColor: speaker.color, fontSize: 56 }}
              >
                <Image
                  src={speaker.image}
                  alt={speaker.name}
                  fill
                  placeholder="blur"
                  sizes="(max-width: 768px) 100vw, 340px"
                  className="object-cover"
                />
                {speaker.event && (
                  <div
                    className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5"
                    style={{
                      height: 32,
                      background: 'rgba(22,11,43,0.3)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                    }}
                  >
                    <Image src={speaker.event.logo} alt="" className="object-contain" height={16} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                      {speaker.event.label}
                    </span>
                  </div>
                )}
              </div>
              <motion.div
                className="p-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.22 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-[#1a1a1a] tracking-tight leading-tight truncate">
                      {speaker.name}
                    </h3>
                    <p className="text-sm text-[#3a3a3a] mt-1">{speaker.title}</p>
                    <p className="text-sm text-[#6b6b6b]">{speaker.company}</p>
                  </div>
                  {speaker.companyLogo && (
                    <Image
                      src={speaker.companyLogo}
                      alt=""
                      className="object-contain shrink-0"
                      height={companyLogoHeight}
                    />
                  )}
                </div>
                <a
                  href={`https://archive.devcon.org/watch/?sort=eventId&order=desc&q=${encodeURIComponent(speaker.name.toLowerCase())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="mt-4 flex items-center justify-center gap-2 w-full rounded-full bg-[#7235ED] hover:bg-[#6020d0] text-white text-sm font-bold py-2.5 transition-colors"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 2.5 L13 8 L3 13.5 Z" fill="currentColor" />
                  </svg>
                  Watch talks on Devcon Archive
                </a>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
