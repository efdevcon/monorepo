import React from 'react'
import Image from 'next/image'
import ArtImage from './images/new/art-overlay.jpg'

export const ArtOverlay = () => (
  <div className="relative w-full aspect-[430/180] sm:aspect-[1440/320] overflow-hidden">
    <Image src={ArtImage} alt="" fill className="object-cover object-bottom" />
    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(34,17,68,0.57)] to-transparent mix-blend-overlay pointer-events-none" />
  </div>
)
