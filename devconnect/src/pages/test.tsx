import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import ScrollVideo from 'common/components/ba/scroll-video'

export default function Scroll() {
  return <ScrollVideo hasStableConnection={true} playInReverse={true} />
}
