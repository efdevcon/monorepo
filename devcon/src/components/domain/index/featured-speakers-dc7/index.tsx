import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
// import NickJohnsonImage from './speaker-images/Nick-Johnson.png'
import PoojaRanjanImage from './speaker-images/Pooja-Ranjan.png'
import BrunoImage from './speaker-images/bruno.png'
import LoiLuuImage from './speaker-images/Loi-Luu.png'
import MatthewTanImage from './speaker-images/Matthew-Tan.png'
import PrestonVanLoonImage from './speaker-images/Preston-Van-Loon.png'
import RogerDingledineImage from './speaker-images/Roger-Dingledine.png'
// import ShayneCoplanImage from './speaker-images/Shayne-Coplan.png'
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
import { motion, useSpring, useTransform, useInView, AnimatePresence, useAnimation } from 'framer-motion'
import { useHover } from 'react-use-gesture'
import styles from './index.module.scss'
import { Tooltip } from 'components/common/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from 'lib/components/ui/popover'
import { Link } from 'components/common/link'

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

const Speaker = ({
  name,
  role,
  avatarUrl,
  link,
}: {
  name: string
  role: string
  avatarUrl: StaticImageData
  link: string
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tiltAngle, setTiltAngle] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const x = useSpring(0, { stiffness: 300, damping: 30 })
  const y = useSpring(0, { stiffness: 300, damping: 30 })
  // const rotate = useTransform([x, y], () => (isHovered ? tiltAngle : 0))

  const bind = useHover(({ hovering }) => {
    setIsHovered(hovering)
  })

  const handleMouseMove = (event: React.MouseEvent) => {
    const container = containerRef.current
    if (container && isHovered) {
      const rect = container.getBoundingClientRect()
      const mouseX = event.clientX - rect.left - 150
      const mouseY = event.clientY - rect.top - 150

      const deltaX = mouseX - x.get()
      const deltaY = mouseY - y.get()
      const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      const speedThreshold = 5
      if (speed > speedThreshold) {
        const maxTilt = 15
        const minTilt = 5
        const newTiltAngle = Math.min(maxTilt, Math.max(minTilt, speed / 10))

        const tiltDirection = deltaX > 0 ? 1 : -1
        setTiltAngle(newTiltAngle * tiltDirection)
      }

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

  const handleHoverStart = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false)
  }, [])

  return (
    <Link
      to={link || ''}
      ref={containerRef}
      className="group hover:bg-indigo-100 hover:bg-opacity-60 transition-all duration-500 cursor-pointer w-full relative flex items-center rounded-lg"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onTouchStart={handleHoverStart}
      onTouchEnd={handleHoverEnd}
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
          <h3 className="text-[#706ABD] font-semibold lg:font-normal text-xl lg:text-4xl transition-all duration-300 ease-in-out transform lg:group-hover:scale-105 lg:group-hover:translate-x-[10px]">
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
          {mounted && (
            <>
              <Image
                src={avatarUrl}
                alt={name}
                width={250}
                height={250}
                className="object-cover rounded-lg shadow-lg"
              />
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
            </>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

const HighlightedSpeakers = ({
  speakers,
}: {
  speakers: Array<{ name: string; role: string; avatarUrl: StaticImageData; link: string }>
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const controls = useAnimation()

  // useEffect(() => {
  //   if (isInView && !isHovered) {
  //     const rotateInterval = setInterval(() => {
  //       try {
  //         setCurrentIndex(prevIndex => (prevIndex + 4) % speakers.length)
  //         controls.set({ scaleX: 0 })
  //         controls.start({ scaleX: 1, transition: { duration: 6, ease: 'linear' } })
  //       } catch (error) {
  //         console.error('Error in rotateInterval:', error)
  //       }
  //     }, 6000)

  //     controls.start({ scaleX: 1, transition: { duration: 6, ease: 'linear' } })

  //     return () => clearInterval(rotateInterval)
  //   } else if (isHovered) {
  //     controls.stop()
  //     controls.set({ scaleX: 0 })
  //   }
  // }, [isInView, speakers, controls, isHovered])

  const currentSpeakers = useMemo(() => {
    const endIndex = currentIndex + 4
    if (endIndex <= speakers.length) {
      return speakers.slice(currentIndex, endIndex)
    } else {
      return [...speakers.slice(currentIndex), ...speakers.slice(0, endIndex - speakers.length)]
    }
  }, [currentIndex, speakers])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        duration: 0.4,
        ease: 'easeInOut',
      },
    },
    exit: {
      // opacity: 0,
      transition: {
        staggerChildren: 0.15,
        duration: 0.4,
        ease: 'easeInOut',
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -12 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: 'easeInOut',
      },
    },
    exit: {
      opacity: 0,
      x: 12,
      transition: {
        duration: 0.8,
        ease: 'easeInOut',
      },
    },
  }

  // console.log('currentSpeakers', currentSpeakers)
  // console.log('speakers', speakers)

  return (
    <div
      ref={ref}
      className="w-full my-2"
      // initial="hidden"
      // animate="show"
      // variants={containerVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        controls.start({ scaleX: 1, transition: { duration: 6, ease: 'linear' } })
      }}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => {
        setIsHovered(false)
        controls.start({ scaleX: 1, transition: { duration: 6, ease: 'linear' } })
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSpeakers.map(speaker => speaker.name).join(',')}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {currentSpeakers.map((speaker, index) => (
            <motion.div key={`${speaker.name}`} variants={itemVariants}>
              <Speaker name={speaker.name} role={speaker.role} avatarUrl={speaker.avatarUrl} link={speaker.link} />
              {index < currentSpeakers.length - 1 && <div className="border-b border-indigo-100 border-solid" />}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      {/* <div className="flex justify-center items-center w-[100px] bg-gray-100 mx-auto transform translate-y-2">
        <motion.div
          className="h-[2px] w-[100px] bg-indigo-400 origin-center"
          initial={{ scaleX: 0 }}
          animate={controls}
        />
      </div> */}
    </div>
  )
}

const SpeakerSmall = React.memo(
  ({
    speaker,
    butterflies,
  }: {
    speaker: { name: string; role: string; avatarUrl: StaticImageData; link: string }
    butterflies: StaticImageData[]
  }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
      setMounted(true)
    }, [])

    const randomButterfly = useMemo(() => {
      return butterflies[Math.floor(Math.random() * butterflies.length)]
    }, [butterflies])

    const getButterflyPosition = (butterfly: StaticImageData) => {
      if (butterfly === B2 || butterfly === B5) {
        return '-left-2'
      }
      return '-right-2'
    }

    return (
      <Popover open={isHovered}>
        <PopoverTrigger
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="mx-4 group cursor-pointer py-2 pt-3 outline-none border-none"
        >
          <Link to={speaker.link || ''} className="flex flex-col items-center text-center">
            <div className="relative">
              <Image
                src={speaker.avatarUrl}
                alt={speaker.name}
                width={80}
                height={80}
                className="rounded-full w-20 h-20 mb-2 object-cover"
              />
              {mounted && (
                <>
                  <Image
                    src={randomButterfly}
                    alt="Butterfly"
                    width={40}
                    height={40}
                    className={`absolute -top-2 ${getButterflyPosition(
                      randomButterfly
                    )} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />
                </>
              )}
            </div>
            <p className="text-[#706ABD] text-lg font-semibold">{speaker.name}</p>
            <div className="">
              <p className="text-[#706ABD] text-sm">{truncateText(speaker.role, 25)}</p>
            </div>
          </Link>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          sideOffset={10}
          className="bg-[#8c72ae] p-3 rounded-2xl w-auto max-w-[250px] text-xs text-white px-4 pointer-events-none"
        >
          <p>{`${speaker.name} - ${speaker.role}`}</p>
        </PopoverContent>
      </Popover>
    )
  }
)

const AutoScroller = ({
  speakers,
  reverse,
}: {
  speakers: { name: string; role: string; avatarUrl: StaticImageData; link: string }[]
  reverse: boolean
}) => {
  // const duplicatedContributors = [...speakers, ...speakers]
  const butterflies = [B1, B2, B3, B5]

  return (
    <div className={styles.scrollerContainer}>
      <InfiniteScroller speed="180s" pauseOnHover={true} reverse={reverse}>
        {speakers.map((speaker, index) => (
          <SpeakerSmall key={index} speaker={speaker} butterflies={butterflies} />
        ))}
      </InfiniteScroller>
    </div>
  )
}

const FeaturedSpeakers = () => {
  const [mounted, setMounted] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    setMounted(true)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setKey(prevKey => prevKey + 1)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const speakers = useMemo(() => {
    const initialSpeakers = [
      {
        name: 'Aya',
        role: 'Executive Director @ Ethereum Foundation',
        avatarUrl: AyaMiyaguchiImage,
        // link: 'https://x.com/AyaMiyagotchi',
        link: 'https://app.devcon.org/speakers/ADH9HF',
      },
      {
        name: 'Vitalik Buterin',
        role: 'Co-founder @ Ethereum',
        avatarUrl: VitalikImage,
        // link: 'https://x.com/VitalikButerin',
        link: 'https://app.devcon.org/speakers/FLKFV8',
      },
      {
        name: 'Roger Dingledine',
        role: 'Co-founder @ Tor Project',
        avatarUrl: RogerDingledineImage,
        // link: 'https://x.com/RogerDingledine',
        link: 'https://app.devcon.org/speakers/P9TDQR',
      },
      {
        name: 'Bruno Macaes',
        role: 'Political Scientist, Author, and former Secretary of State',
        avatarUrl: BrunoImage,
        // link: 'https://x.com/MacaesBruno',
        link: 'https://app.devcon.org/speakers/PRM7AM',
      },
    ]

    const remainingSpeakers = [
      {
        name: 'Hart Montgomery',
        role: 'CTO of Linux Foundation Decentralized Trust',
        avatarUrl: HartMontgomeryImage,
        link: 'https://www.linkedin.com/in/hartmontgomery/',
      },
      {
        name: 'Tim Beiko',
        role: 'Protocol Support',
        avatarUrl: TimBeikoImage,
        link: 'https://x.com/TimBeiko',
      },
      {
        name: 'Hudson Jameson',
        role: 'Polygon',
        avatarUrl: HudsonJamesonImage,
        link: 'https://x.com/hudsonjameson',
      },
      // {
      //   name: 'Nick Johnson',
      //   role: 'Founder of ENS',
      //   avatarUrl: NickJohnsonImage,
      //   link: 'https://x.com/nicksdjohnson',
      // },
      {
        name: 'Austin Griffith',
        role: '🧙‍♂️ Builder on Ethereum',
        avatarUrl: AustinGriffithImage,
        link: 'https://x.com/austingriffith',
      },
      {
        name: 'Sreeram Kannan',
        role: 'Founder of EigenLayer Protocol',
        avatarUrl: SreeramKannanImage,
        link: 'https://x.com/sreeramkannan',
      },
      {
        name: 'Juan Benet',
        role: 'Protocol Labs, IPFS and Filecoin Founder',
        avatarUrl: JuanBennetImage,
        link: 'https://x.com/juanbenet',
      },
      {
        name: 'Kevin Owocki',
        role: 'Founder @Gitcoin',
        avatarUrl: KevinOwockiImage,
        link: 'https://x.com/owocki',
      },
      {
        name: 'Lefteris Karapetsas',
        role: 'Founder of rotki',
        avatarUrl: LefterisKarapetsasImage,
        link: 'https://x.com/LefterisJP',
      },
      {
        name: 'Trent Van Epps',
        role: 'Political Organizer @ Protocol Guild',
        avatarUrl: TrentVanEppsImage,
        link: 'https://x.com/trent_vanepps',
      },
      // {
      //   name: 'Shayne Coplan',
      //   role: 'CEO @Polymarket',
      //   avatarUrl: ShayneCoplanImage,
      //   link: 'https://x.com/shayne_coplan',
      // },
      {
        name: 'Gubsheep',
        role: 'Co-founder of 0xPARC and creator of the Dark Forest game',
        avatarUrl: GubsheepImage,
        link: 'https://x.com/gubsheep',
      },
      {
        name: 'Bartek Kiepuszewski',
        role: 'L2BEAT Founder',
        avatarUrl: BartekKiepuszewskiImage,
        link: 'https://x.com/bkiepuszewski',
      },
      { name: 'Ann Brody', role: 'DAO Researcher', avatarUrl: AnnBrodyImage, link: 'https://x.com/annbrody7' },
      {
        name: 'Jay Baxter',
        role: '@CommunityNotes Founding ML Lead / Sr. Staff ML Eng @X. Built BayesDB @MIT',
        avatarUrl: JayBaxterImage,
        link: 'https://x.com/_jaybaxter_',
      },
      {
        name: 'Pooja Ranjan',
        role: 'Ethereum Cat Herders',
        avatarUrl: PoojaRanjanImage,
        link: 'https://x.com/poojaranjan19',
      },
      {
        name: 'Loi Luu',
        role: 'Co-founder of Kyber Network',
        avatarUrl: LoiLuuImage,
        link: 'https://x.com/loi_luu',
      },
      {
        name: 'Matthew Tan',
        role: 'Founder of Etherscan',
        avatarUrl: MatthewTanImage,
        link: 'https://x.com/mtbitcoin',
      },
      {
        name: 'Preston Van Loon',
        role: 'Ethereum Core Developer on the Prysm team at Offchain Labs.',
        avatarUrl: PrestonVanLoonImage,
        link: 'https://x.com/preston_vanloon',
      },
      {
        name: 'Zac Williamson',
        role: 'CEO & Co-Founder Aztec Network',
        avatarUrl: ZacWilliamsonImage,
        link: 'https://x.com/Zac_Aztec',
      },
    ]

    // Deterministic shuffle for the initial 4 speakers (to avoid hydration error), after component mounts, we shuffle the remaining speakers
    if (!mounted) return initialSpeakers.concat(remainingSpeakers)

    // Shuffle the remaining speakers
    for (let i = remainingSpeakers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[remainingSpeakers[i], remainingSpeakers[j]] = [remainingSpeakers[j], remainingSpeakers[i]]
    }

    return [...initialSpeakers, ...remainingSpeakers]
  }, [mounted])

  const half = Math.ceil(speakers.length / 2)
  const firstHalf = speakers.slice(0, half)
  const secondHalf = speakers.slice(half)

  return (
    <div className="mt-8 mb-4">
      <h2 className="font-secondary mb-6">Featured Speakers</h2>
      <HighlightedSpeakers key={key} speakers={speakers} />
      {/* <div className="flex flex-col mt-8">
        <AutoScroller speakers={firstHalf} reverse />
        <div className="my-2" />
        <AutoScroller speakers={secondHalf} reverse={false} />
      </div> */}
    </div>
  )
}

export default FeaturedSpeakers
