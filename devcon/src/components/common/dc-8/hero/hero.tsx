import React from 'react'
import { Fireflies } from './fireflies'
import Image from 'next/image'
import DC8Background from './images/pexels.jpg'

export const Hero = () => {
  return (
    <div className="relative h-screen w-screen">
      <Fireflies id="lower-fireflies" />
      <Image src={DC8Background} alt="Devcon 8 Background" fill className="w-full h-full object-cover" />
    </div>
  )
}
