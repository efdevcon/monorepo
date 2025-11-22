import React from 'react'
import { Fireflies } from './fireflies'
import Image from 'next/image'
import DC8Background from './images/wow.png'

const CenteredOverlayContent = () => {
  return (
    <div className="absolute h-full inset-0 w-full flex items-center justify-center z-[11] text-black">
      <div className="flex font-secondary text-white flex-col items-center justify-center gap-4">
        <div className="text-xl font-semibold" style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}>
          Ethereum's global community and developer conference
        </div>
        <h1 className="text-lg font-medium">MUMBAI, INDIA</h1>
      </div>
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
