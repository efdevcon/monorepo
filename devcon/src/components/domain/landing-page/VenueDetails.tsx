import React from 'react'
import Image from 'next/image'
import JwcLogo from 'assets/images/dc-8/jio-world-centre.png'

export const VenueDetails = () => (
  <div className="bg-[#ffa366] flex flex-col md:flex-row items-center justify-center px-6 py-3 text-[#221144] text-sm leading-5 gap-x-4 gap-y-1 text-center">
    <span className="flex items-center gap-2">
      <strong className="font-bold">Venue:</strong>
      <Image src={JwcLogo} alt="Jio World Centre" className="h-5 w-auto shrink-0" />
    </span>
    {/* Dates: hidden on tablet and below */}
    <span className="hidden lg:inline">
      <strong className="font-bold">Dates:</strong> <span>3–6 November, 2026</span>
    </span>
    <span>
      {/* "Address:" label hidden on tablet and below */}
      <strong className="font-bold hidden lg:inline">Address:</strong> <span>G Block, Bandra Kurla Complex (BKC), Mumbai, India</span>
    </span>
  </div>
)
