import React, { useState, useRef, useEffect, useMemo } from 'react'
import Image, { StaticImageData } from 'next/image'
import VitalikImage from './speaker-images/vitalik.png'
import AnnBrodyImage from './speaker-images/Ann-Brody.png'
import AustinGriffithImage from './speaker-images/Austin-Griffith.png'
import AyaMiyaguchiImage from './speaker-images/Aya-Miyaguchi.png'
import BartekKiepuszewskiImage from './speaker-images/Bartek-Kiepuszewski.png'
import GubsheepImage from './speaker-images/Gubsheep.png'
import HartMontgomeryImage from './speaker-images/Hart-Montgomery.png'
import HudsonJamesonImage from './speaker-images/Hudson-Jameson.png'
import JayBaxterImage from './speaker-images/Jay-Baxter.png'
import JuanBennetImage from './speaker-images/Juan-Bennet.png'
import KevinOwockiImage from './speaker-images/Kevin-Owocki.png'
import LefterisKarapetsasImage from './speaker-images/Lefteris-Karapetsas.png'
import NickJohnsonImage from './speaker-images/Nick-Johnson.png'
import PoojaRanjanImage from './speaker-images/Pooja-Ranjan.png'
import LoiLuuImage from './speaker-images/Loi-Luu.png'
import MatthewTanImage from './speaker-images/Matthew-Tan.png'
import PrestonVanLoonImage from './speaker-images/Preston-Van-Loon.png'
import RogerDingledineImage from './speaker-images/Roger-Dingledine.png'
import ShayneCoplanImage from './speaker-images/Shayne-Coplan.png'
import SreeramKannanImage from './speaker-images/Sreeram-Kannan.png'
import TimBeikoImage from './speaker-images/Tim-Beiko.png'
import TrentVanEppsImage from './speaker-images/Trent-Van-Epps.png'
import ZacWilliamsonImage from './speaker-images/Zac-Williamson.png'
import B1 from './butterflies/b1.png'
import B2 from './butterflies/b2.png'
import B3 from './butterflies/b3.png'
import B4 from './butterflies/b4.png'
import B5 from './butterflies/b5.png'
import InfiniteScroller from 'lib/components/infinite-scroll'
import { motion, useSpring, useTransform, useInView } from 'framer-motion'
import { useHover } from 'react-use-gesture'
import styles from './index.module.scss'
import { Tooltip } from 'components/common/tooltip'
// import { AutoScroller } from 'components/domain/dips/overview/contribute/Contribute' // Import the AutoScroller

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

const Speaker = ({ name, role, avatarUrl }: { name: string; role: string; avatarUrl: StaticImageData }) => {
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tiltAngle, setTiltAngle] = useState(0)

  const x = useSpring(0, { stiffness: 300, damping: 30 })
  const y = useSpring(0, { stiffness: 300, damping: 30 })
  const rotate = useTransform([x, y], () => (isHovered ? tiltAngle : 0))

  const bind = useHover(({ hovering }) => {
    setIsHovered(hovering)
    // if (hovering) {
    //   // Generate a random angle between 5 and 15 degrees, then randomly negate it
    //   const randomAngle = (Math.random() * 10 + 5) * (Math.random() < 0.5 ? -1 : 1)
    //   setTiltAngle(randomAngle)
    // }
  })

  const handleMouseMove = (event: React.MouseEvent) => {
    const container = containerRef.current
    if (container && isHovered) {
      const rect = container.getBoundingClientRect()
      const mouseX = event.clientX - rect.left - 150
      const mouseY = event.clientY - rect.top - 150

      // Calculate the speed of the mouse movement
      const deltaX = mouseX - x.get()
      const deltaY = mouseY - y.get()
      const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Introduce a threshold to reduce jiggling on small movements
      const speedThreshold = 5
      if (speed > speedThreshold) {
        // Adjust the tilt angle based on the direction and speed
        const maxTilt = 15
        const minTilt = 5
        const newTiltAngle = Math.min(maxTilt, Math.max(minTilt, speed / 10))

        // Determine the tilt direction based on the movement direction
        const tiltDirection = deltaX > 0 ? 1 : -1
        setTiltAngle(newTiltAngle * tiltDirection)
      }

      // Update the spring values only if the mouse has moved
      if (deltaX !== 0 || deltaY !== 0) {
        x.set(mouseX)
        y.set(mouseY)
      }
    }
  }

  const randomButterfly = useMemo(() => {
    const butterflies = [B1, B2, B3, B4, B5]
    return butterflies[Math.floor(Math.random() * butterflies.length)]
  }, [isHovered])

  const randomCorner = useMemo(() => {
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    return corners[Math.floor(Math.random() * corners.length)]
  }, [isHovered])

  return (
    <div
      ref={containerRef}
      className="group hover:bg-indigo-100 hover:bg-opacity-60 transition-all duration-500 cursor-pointer w-full relative flex items-center rounded-lg"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 z-10" {...bind()} />
      <div className="flex-1 p-3 flex justify-between items-center">
        <Image
          src={avatarUrl}
          alt={name}
          width={80}
          height={80}
          className="rounded-full w-[60px] h-[60px] lg:w-[80px] lg:h-[80px] mr-4 object-cover shrink-0"
        />

        <div className="flex flex-col lg:flex-row justify-between grow lg:items-center">
          <h3 className="text-[#706ABD] text-xl lg:text-4xl transition-all duration-300 ease-in-out transform lg:group-hover:scale-105 lg:group-hover:translate-x-[10px]">
            {name}
          </h3>
          <p className="text-[#706ABD] text-base lg:text-xl lg:text-right">{role}</p>
        </div>
      </div>
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: 0 }}
        animate={{
          scale: isHovered ? 1 : 0,
          opacity: isHovered ? 1 : 0,
          rotate: tiltAngle,
        }}
        style={{
          x,
          y,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute pointer-events-none z-10"
      >
        <div className="relative">
          <Image src={avatarUrl} alt={name} width={250} height={250} className="object-cover rounded-lg shadow-lg" />
          <Image
            src={randomButterfly}
            alt="Butterfly"
            width={80}
            height={80}
            className={`absolute ${
              randomCorner === 'top-left'
                ? '-top-4 -left-4'
                : randomCorner === 'top-right'
                ? '-top-4 -right-4'
                : randomCorner === 'bottom-left'
                ? '-bottom-4 -left-4'
                : '-bottom-4 -right-4'
            } 
            transform ${randomCorner.includes('right') ? 'scale-x-[-1]' : ''}`}
          />
        </div>
      </motion.div>
    </div>
  )
}

const HighlightedSpeakers = () => {
  const speakers = [
    { name: 'Aya Mayaguchi', role: 'Director @ Ethereum Foundation', avatarUrl: AyaMiyaguchiImage },
    { name: 'Vitalik Buterin', role: 'Co-founder @ Ethereum', avatarUrl: VitalikImage },
    { name: 'Roger Dingledine', role: 'Co-founder @ Tor Project', avatarUrl: RogerDingledineImage },
    { name: 'Hart Montgomery', role: 'CTO @ Linux Foundation', avatarUrl: HartMontgomeryImage },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.8,
        ease: 'easeInOut',
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 0 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeInOut',
      },
    },
  }

  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      className="w-full my-2"
      initial="hidden"
      animate={isInView ? 'show' : 'hidden'}
      variants={containerVariants}
    >
      {speakers.map((speaker, index) => (
        <React.Fragment key={index}>
          <motion.div variants={itemVariants}>
            <Speaker name={speaker.name} role={speaker.role} avatarUrl={speaker.avatarUrl} />
          </motion.div>
          {index < speakers.length - 1 && <div className="border-b border-indigo-100 border-solid" />}{' '}
          {/* Add a border between speakers */}
        </React.Fragment>
      ))}
    </motion.div>
  )
}

const AutoScroller = ({
  contributors,
  reverse,
}: {
  contributors: { name: string; role: string; avatarUrl: StaticImageData }[]
  reverse: boolean
}) => {
  const duplicatedContributors = [...contributors, ...contributors] // Duplicate the contributors
  const butterflies = [B1, B2, B3, B5]

  const getButterflyPosition = (butterfly: StaticImageData) => {
    if (butterfly === B2 || butterfly === B5) {
      return '-left-2'
    }
    return '-right-2'
  }

  return (
    <div className={styles.scrollerContainer}>
      <InfiniteScroller speed="200s" pauseOnHover={true} reverse={reverse}>
        {duplicatedContributors.map((contributor, index) => {
          const randomButterfly = butterflies[Math.floor(Math.random() * butterflies.length)]

          return (
            <Tooltip key={index} content={`${contributor.name} - ${contributor.role}`}>
              <div
                key={index}
                className="inline-block mx-4 hover:scale-105 transition-all duration-300 cursor-pointer py-2 group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Image
                      src={contributor.avatarUrl}
                      alt={contributor.name}
                      width={80}
                      height={80}
                      className="rounded-full w-20 h-20 mb-2 object-cover"
                    />
                    <Image
                      src={randomButterfly}
                      alt="Butterfly"
                      width={40}
                      height={40}
                      className={`absolute -top-2 ${getButterflyPosition(
                        randomButterfly
                      )} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    />
                  </div>
                  <p className="text-[#706ABD] text-lg font-semibold">{contributor.name}</p>
                  <div className="h-10">
                    <p className="text-[#706ABD] text-sm mt-1">{truncateText(contributor.role, 30)}</p>
                  </div>
                </div>
              </div>
            </Tooltip>
          )
        })}
      </InfiniteScroller>
    </div>
  )
}

const FeaturedSpeakers = () => {
  const contributors = [
    { name: 'Ann Brody', role: 'DAO Researcher', avatarUrl: AnnBrodyImage },
    { name: 'Austin Griffith', role: '🧙‍♂️ Builder on Ethereum', avatarUrl: AustinGriffithImage },
    { name: 'Bartek Kiepuszewski', role: 'L2BEAT Founder', avatarUrl: BartekKiepuszewskiImage },
    { name: 'Gubsheep', role: 'Co-founder of 0xPARC and creator of the Dark Forest game', avatarUrl: GubsheepImage },
    { name: 'Hudson Jameson', role: 'Polygon', avatarUrl: HudsonJamesonImage },
    { name: 'Juan Bennet', role: 'Protocol Labs, IPFS and Filecoin Founder', avatarUrl: JuanBennetImage },
    { name: 'Kevin Owocki', role: 'Founder @Gitcoin', avatarUrl: KevinOwockiImage },
    { name: 'Lefteris Karapetsas', role: 'Founder of Rotki', avatarUrl: LefterisKarapetsasImage },
    { name: 'Nick Johnson', role: 'Founder of ENS', avatarUrl: NickJohnsonImage },
    {
      name: 'Jay Baxter',
      role: '@CommunityNotes Founding ML Lead / Sr. Staff ML Eng @X. Built BayesDB @MIT',
      avatarUrl: JayBaxterImage,
    },
    { name: 'Pooja Ranjan', role: 'Ethereum Cat Herders', avatarUrl: PoojaRanjanImage },
    { name: 'Loi Luu', role: 'Co-founder of Kyber Network', avatarUrl: LoiLuuImage },
    { name: 'Matthew Tan', role: 'Founder of Etherscan', avatarUrl: MatthewTanImage },
    {
      name: 'Preston Van Loon',
      role: 'Ethereum Core Developer on the Prysm team at Offchain Labs.',
      avatarUrl: PrestonVanLoonImage,
    },
    { name: 'Shayne Coplan', role: 'CEO @Polymarket', avatarUrl: ShayneCoplanImage },
    { name: 'Sreeram Kannan', role: 'Founder of EigenLayer Protocol', avatarUrl: SreeramKannanImage },
    { name: 'Tim Beiko', role: 'Protocol Support', avatarUrl: TimBeikoImage },
    { name: 'Trent Van Epps', role: 'Political Organizer @ Protocol Guild', avatarUrl: TrentVanEppsImage },
    { name: 'Zac Williamson', role: 'CEO & Co-Founder Aztec Network', avatarUrl: ZacWilliamsonImage },
  ]

  const half = Math.ceil(contributors.length / 2)
  const firstHalf = contributors.slice(0, half)
  const secondHalf = contributors.slice(half)

  return (
    <div className="mt-8">
      <h2 className="font-secondary mb-6">Featured Speakers</h2>
      <HighlightedSpeakers />
      <div className="flex flex-col mt-8">
        <AutoScroller contributors={firstHalf} reverse /> {/* First row of contributors */}
        <div className="my-2" />
        <AutoScroller contributors={secondHalf} reverse={false} /> {/* Second row of contributors */}
      </div>
    </div>
  )
}

export default FeaturedSpeakers
