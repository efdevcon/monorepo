import React, { useState, useRef, useEffect } from 'react'
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
import InfiniteScroller from 'lib/components/infinite-scroll'
import { motion, useSpring, useTransform, useInView } from 'framer-motion'
import { useHover } from 'react-use-gesture'
import styles from './index.module.scss'
import { Tooltip } from 'components/common/tooltip'
// import { AutoScroller } from 'components/domain/dips/overview/contribute/Contribute' // Import the AutoScroller

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
        <Image src={avatarUrl} alt={name} width={250} height={250} className="object-cover rounded-lg shadow-lg" />
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
    hidden: { opacity: 0, y: -50 },
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

const AutoScroller = ({ contributors }: { contributors: { name: string; avatarUrl: StaticImageData }[] }) => {
  const duplicatedContributors = [...contributors, ...contributors] // Duplicate the contributors

  return (
    <div className={styles.scrollerContainer}>
      <InfiniteScroller speed="80s" pauseOnHover={true}>
        {duplicatedContributors.map((contributor, index) => (
          <Tooltip key={index} content={contributor.name}>
            <div key={index} className={styles.contributorItem}>
              <div className="flex items-center">
                <Image
                  src={contributor.avatarUrl}
                  alt={contributor.name}
                  width={80}
                  height={80}
                  className="rounded-full w-[80px] h-[80px] mr-3 object-cover"
                />
                <p className="text-[#706ABD] text-lg">{contributor.name}</p>
              </div>
            </div>
          </Tooltip>
        ))}
      </InfiniteScroller>
    </div>
  )
}

const FeaturedSpeakers = () => {
  const contributors = [
    { name: 'Ann Brody', avatarUrl: AnnBrodyImage },
    { name: 'Austin Griffith', avatarUrl: AustinGriffithImage },
    { name: 'Bartek Kiepuszewski', avatarUrl: BartekKiepuszewskiImage },
    { name: 'Gubsheep', avatarUrl: GubsheepImage },
    { name: 'Hudson Jameson', avatarUrl: HudsonJamesonImage },
    { name: 'Jay Baxter', avatarUrl: JayBaxterImage },
    { name: 'Juan Bennet', avatarUrl: JuanBennetImage },
    { name: 'Kevin Owocki', avatarUrl: KevinOwockiImage },
    { name: 'Lefteris Karapetsas', avatarUrl: LefterisKarapetsasImage },
    { name: 'Nick Johnson', avatarUrl: NickJohnsonImage },
    { name: 'Pooja Ranjan', avatarUrl: PoojaRanjanImage },
    { name: 'Loi Luu', avatarUrl: LoiLuuImage },
    { name: 'Matthew Tan', avatarUrl: MatthewTanImage },
    { name: 'Preston Van Loon', avatarUrl: PrestonVanLoonImage },
    { name: 'Shayne Coplan', avatarUrl: ShayneCoplanImage },
    { name: 'Sreeram Kannan', avatarUrl: SreeramKannanImage },
    { name: 'Tim Beiko', avatarUrl: TimBeikoImage },
    { name: 'Trent Van Epps', avatarUrl: TrentVanEppsImage },
    { name: 'Zac Williamson', avatarUrl: ZacWilliamsonImage },
  ]

  const half = Math.ceil(contributors.length / 2)
  const firstHalf = contributors.slice(0, half)
  const secondHalf = contributors.slice(half)

  return (
    <div className="mt-8" id="featured-speakers">
      <h2 className="font-secondary mb-6">Devcon SEA Programming</h2>
      <HighlightedSpeakers />
      <div className="flex flex-col my-6 mt-8">
        <AutoScroller contributors={firstHalf} /> {/* First row of contributors */}
        <div className="my-1" />
        <AutoScroller contributors={secondHalf} /> {/* Second row of contributors */}
      </div>
    </div>
  )
}

export default FeaturedSpeakers
