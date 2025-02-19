import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import BA from 'assets/images/dc-ba/ba.jpg'
import Image from 'next/image'
import Voxel from 'common/components/ba/voxel'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function Scroll() {
  const main = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const boxes = gsap.utils.toArray('.box')

      gsap.to('#devconnect', {
        x: '20%',
        scale: 2.5,
        scrollTrigger: {
          id: 'devconnect-trigger',
          trigger: '#devconnect',
          start: 'top top',
          end: 'bottom center',
          //   toggleClass: 'bg-blue-700',
          scrub: true,
          //   markers: true,
        },
      })

      gsap.to('#buenos-aires', {
        x: '-20%',
        scale: 2.5,
        scrollTrigger: {
          id: 'buenos-aires-trigger',
          trigger: '#buenos-aires',
          start: 'top top',
          end: 'bottom center',
          scrub: true,
          //   markers: true,
        },
      })

      gsap.set('#ba-image', { opacity: 0 })

      gsap.to('#ba-image', {
        opacity: 1,
        scrollTrigger: {
          id: 'ba-image-trigger',
          trigger: '#buenos-aires',
          start: 'center top',
          end: 'bottom center',
          scrub: true,
          //   markers: true,
        },
      })

      //   boxes.forEach(box => {
      //     gsap.to(box, {
      //       x: 300,
      //       scale: 1.5,
      //       scrollTrigger: {
      //         trigger: main,
      //         start: 'top center',
      //         end: 'center end',
      //         scrub: true,
      //         markers: true,
      //       },
      //     })
      //   })
    },
    { scope: main }
  )

  return (
    <div className="h-[300vh] w-screen bg-yellow-500" ref={main}>
      {/* <section className="section flex text-black bg-red-500">
        <h2>Basic ScrollTrigger with React</h2>
        <p>Scroll down to see the magic happen!!</p>
      </section> */}
      <div id="devconnect" className="box h-[100vh] flex items-center justify-center w-full">
        Devconnect
      </div>
      <div id="buenos-aires" className="box h-[100vh] flex relative items-center justify-center w-full">
        Buenos Aires
        <Image src={BA} alt="Buenos Aires" className="absolute inset-0 w-full h-full object-cover" id="ba-image" />
      </div>

      <Voxel />

      {/* <section className="section"></section> */}
    </div>
  )
}
