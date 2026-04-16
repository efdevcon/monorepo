import React from 'react'
import Image from 'next/image'
import g1 from './images/new/gallery-1.jpg'
import g2 from './images/new/gallery-2.jpg'
import g3 from './images/new/gallery-3.jpg'
import g4 from './images/new/gallery-4.jpg'
import g5 from './images/new/gallery-5.jpg'
import g6 from './images/new/gallery-6.jpg'
import g7 from './images/new/gallery-7.jpg'

const Photo = ({ src, alt, className }: { src: any; alt: string; className?: string }) => (
  <div className={`relative rounded-2xl overflow-hidden ${className || ''}`}>
    <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
  </div>
)

export const PhotoGallery = () => (
  <div className="bg-[#eae6f2] px-5 sm:px-8 md:px-16 pt-8 sm:pt-14 pb-12 sm:pb-20">
    {/* Mobile: 2x2 grid */}
    <div className="grid grid-cols-2 gap-3 md:hidden">
      <Photo src={g2} alt="" className="aspect-[4/3]" />
      <Photo src={g3} alt="" className="aspect-[4/3]" />
      <Photo src={g5} alt="" className="aspect-[4/3]" />
      <Photo src={g7} alt="" className="aspect-[4/3]" />
    </div>

    {/* Tablet+: full 2-row layout */}
    <div className="hidden md:flex flex-col gap-4">
      <div className="flex gap-4 h-[292px]">
        <Photo src={g1} alt="" className="w-[15%] hidden lg:block" />
        <Photo src={g2} alt="" className="flex-1" />
        <Photo src={g3} alt="" className="flex-1" />
        <Photo src={g4} alt="" className="w-[15%] hidden lg:block" />
      </div>
      <div className="flex gap-4 h-[300px]">
        <Photo src={g5} alt="" className="flex-[648]" />
        <Photo src={g6} alt="" className="flex-[200] hidden lg:block" />
        <Photo src={g7} alt="" className="flex-[432]" />
      </div>
    </div>
  </div>
)
