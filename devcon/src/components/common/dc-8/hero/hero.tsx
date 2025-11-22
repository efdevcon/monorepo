import React from 'react'
import { Fireflies } from './fireflies'
import Image from 'next/image'
import DC8Background from './images/wow.png'

const CenteredOverlayContent = () => {
  return (
    <div className="absolute h-full w-full flex items-center justify-center z-[11] text-black">
      <h1 className="text-4xl font-bold">Devcon 8</h1>
      <div>Ethereum's global community and developer conference</div>
    </div>
  )
}

export const Hero = () => {
  return (
    <div className="relative h-screen w-screen">
      <Fireflies id="lower-fireflies" />
      <CenteredOverlayContent />
      <Image src={DC8Background} alt="Devcon 8 Background" fill className="w-full h-full object-cover" />
    </div>
  )
}
