import React from 'react'
import { Button } from '@/components/button'
import cn from 'classnames'
import styles from './sections.module.scss'
import Tree from './images/tree.png'
import Sign from './images/sign.png'
import Image from 'next/image'
import Path from './images/path.png'
import Tile from './images/tile-right.png'
import TileEnd from './images/tile-end.png'
import Check from './images/check.png'

export const FirstSection = () => {
  return (
    <div
      className={cn('section relative w-full text-white py-8 gap-4 z-[11] shadow-lg', 'w-screen', styles.tiled)}
      id="first-section"
    >
      <div className="flex flex-col justify-center items-center gap-4">
        <div className="flex flex-col items-center justify-center gap-6 w-[600px] max-w-[90%] text-center">
          <div className="font-bold text-4xl">Organize your Destino Devconnect event</div>
          <div className="text-lg">
            <b>Devconnect is coming to Buenos Aires this November</b>, and we're supporting local builders, organizers,
            and communities on the mission to bring Argentina onchain. Between now and November, we're supporting events
            across Argentina and Latam that help onboard people to Ethereum and show how it can be used in Argentina and
            Latam. If you're already doing this work or have an idea and need a little help to make it real, Destino
            Devconnect is for you.
          </div>
          <Button fat fill color="black-1">
            Apply Now
          </Button>
        </div>
      </div>
    </div>
  )
}

interface PlatformProps {
  color?: string
  className?: string
  sectionContentId?: string
  triangleColor?: string
  triangleColorShade?: string
  triangleColorShade2?: string
  reverse?: boolean
  children: React.ReactNode
}

const Platform = ({
  className,
  sectionContentId,
  reverse,
  triangleColor,
  triangleColorShade,
  triangleColorShade2,
  children,
}: PlatformProps) => {
  return (
    <div className="relative w-full">
      <TriangleSection
        className={cn('absolute inset-0 translate-y-[10%]', triangleColorShade, styles['mask-gradient-to-r'])}
      >
        <></>
      </TriangleSection>
      <TriangleSection
        className={cn('absolute inset-0 translate-y-[10%]', triangleColorShade2, styles['mask-gradient-to-l'])}
      >
        <></>
      </TriangleSection>
      <TriangleSection className={cn('relative z-10')}>
        <div className="relative z-10" id={sectionContentId}>
          {children}
        </div>
        <Image
          src={Tile}
          alt="Tile"
          className={cn(
            'absolute bottom-0 z-[10] w-[30%] left-1/2 -translate-x-[17.5%]',
            reverse ? 'scale-x-[-1] !translate-x-[17.5%] right-1/2 left-auto' : ''
          )}
        />
        <Image
          src={TileEnd}
          alt="Tile"
          className={cn(
            'absolute bottom-0 z-[10] w-[30%] translate-y-[-82.5%] left-1/2 -translate-x-[-65%]',
            reverse ? 'scale-x-[-1] !translate-x-[-65%] right-1/2 left-auto' : ''
          )}
        />

        <Image src={Sign} alt="Sign" className="absolute z-[12] top-0 right-0 translate-x-[-200%] translate-y-[45%]" />
      </TriangleSection>
      <TriangleSection className={cn('absolute bottom-0 left-0 right-0 h-[3000px] z-[9]', triangleColor, styles.grass)}>
        <></>
      </TriangleSection>
    </div>
  )
}

export const SecondSection = () => {
  const sectionColor = 'bg-[#829b15]'
  const shade = 'bg-[#B2CD3E]'
  const shade2 = 'bg-[#629522]'

  return (
    <div className="relative z-10" id="second-section">
      <Platform
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="second-section-content"
      >
        <div
          className={cn(
            'flex flex-col gap-4 justify-center items-center text-center w-full pt-8 lg:translate-y-[50%] lg:h-[200px]'
          )}
        >
          <div className="text-white text-4xl font-bold shrink-0">What is Destino Devconnect?</div>
          <div className="flex flex-col gap-4 w-[500px] max-w-[90%] relative text-lg shrink-0">
            <Image src={Tree} alt="Tree" className="absolute top-0 left-0 translate-x-[-170%] translate-y-[-30%]" />
            <Image src={Tree} alt="Tree" className="absolute top-0 left-0 translate-x-[-270%] translate-y-[-15%]" />
            <Image src={Tree} alt="Tree" className="absolute top-0 left-0 translate-x-[-200%] translate-y-[40%]" />
            {/* <Image src={Sign} alt="Sign" className="absolute bottom-0 right-0 translate-x-[150%] translate-y-[50%]" /> */}
            Destino Devconnect is a local grant round leading up to Devconnect ARG. It's both...
            <div className="flex flex-col gap-4 text-base">
              <div className="flex flex-col items-center gap-1">
                <div className="text-yellow-500 text-2xl font-bold">A grant</div>
                <div>we're offering up to $1,000 in support per event</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-yellow-500 text-2xl font-bold">A shared banner</div>
                <div>
                  connecting local efforts across the region that share one mission: to accelerate Ethereum adoption in
                  Argentina and beyond
                </div>
              </div>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const ThirdSection = () => {
  const sectionColor = 'bg-[#b81175]'
  const shade = 'bg-[#E897C5]'
  const shade2 = 'bg-[#BA4588]'

  return (
    <div className="relative z-[9]" id="third-section">
      <Platform
        reverse
        className=""
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="third-section-content"
      >
        <div className={cn('flex flex-col gap-4 justify-center items-center text-center')}>
          <div className="flex flex-col items-center gap-4 w-[700px] max-w-[90%] lg:translate-y-[50%] pt-8 lg:h-[200px]">
            <div className="text-white text-4xl font-bold shrink-0">Who it's for</div>
            <div className="flex flex-col justify-center items-center gap-8 text-lg shrink-0">
              <div className="shrink-0 text-yellow-500 text-2xl">You're eligible if you...</div>
              <div className="grid grid-cols-4 gap-4 shrink-0 text-base">
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>Are based in Argentina or Latam</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>Have a track record of community-building or event organizing</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>Are already hosting meetups, workshops, or events, or want to start</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Image src={Check} alt="Check" className="w-14 h-14" />
                  <div>
                    Share the mission of bringing Argentina onchain{' '}
                    {/* through education, onboarding, app demos, or new
                    collaborations */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const FourthSection = () => {
  const sectionColor = 'bg-[#A2D0FA]'
  const shade = 'bg-[#80B6E8]'
  const shade2 = 'bg-[#498FCE]'

  return (
    <div className="relative z-[8]" id="fourth-section">
      <Platform
        triangleColor={sectionColor}
        triangleColorShade={shade}
        triangleColorShade2={shade2}
        sectionContentId="fourth-section-content"
      >
        <div className={cn('flex flex-col gap-4 justify-center items-center text-center')}>
          <div className="flex flex-col items-center gap-4 w-[500px] max-w-[90%] lg:translate-y-[50%] lg:h-[200px] pt-8">
            <div className="text-white text-4xl font-bold">What you get</div>
            <div className="flex flex-col justify-center items-center gap-4 text-lg">
              <ul>
                <li>Up to $1,000 in funding</li>
                <li>Help with speakers and sponsors if you need it</li>
                <li>A spot on the Destino Devconnect calendar</li>
                <li>Visibility across Devconnect's official comms</li>
              </ul>
            </div>
          </div>
        </div>
      </Platform>
    </div>
  )
}

export const HowToApply = () => {
  return (
    <div className="section my-16 mt-24">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center justify-center gap-4 w-[800px] max-w-[90%]">
          <div className="text-white text-4xl font-bold">How to apply</div>
          <div className="flex gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="text-yellow-500 text-3xl font-bold">1</div>
              <div>Head to the Ecosystem Support Program and fill out the form (takes ~X mins)</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-yellow-500 text-3xl font-bold">2</div>
              <div>If it's a good fit, we'll invite you for a 30-min call</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-yellow-500 text-3xl font-bold">3</div>
              <div>Get support — host your event — help shape the Ethereum momentum in Argentina</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TriangleSectionProps {
  children: React.ReactNode
  aspectRatio?: number
  className?: string
}

const TriangleSection = ({ children, aspectRatio = 69 / 20, className }: TriangleSectionProps) => {
  const [triangleHeight, setTriangleHeight] = React.useState(100)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const updateTriangleHeight = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        // Calculate triangle height based on width and desired aspect ratio
        const height = width / aspectRatio
        setTriangleHeight(height)
      }
    }

    // Initial calculation
    updateTriangleHeight()

    // Update on resize
    window.addEventListener('resize', updateTriangleHeight)
    return () => window.removeEventListener('resize', updateTriangleHeight)
  }, [aspectRatio])

  const clipPath = `polygon(
    0 0, 
    100% 0, 
    100% calc(100% - ${triangleHeight}px), 
    50% 100%, 
    0 calc(100% - ${triangleHeight}px)
  )`

  return (
    <div
      ref={containerRef}
      style={{
        clipPath: clipPath,
        WebkitClipPath: clipPath,
        paddingBottom: `${triangleHeight}px`,
      }}
      className={className}
    >
      {children}
    </div>
  )
}

export const EventsList = () => {
  return (
    <div className="section">
      <div className="flex flex-col items-center justify-center gap-4 ">
        <div className="flex flex-col items-center justify-center gap-4 w-[500px] max-w-[90%]">
          <div className="text-white text-4xl font-bold">Events</div>

          <EventsTable />
        </div>
      </div>
    </div>
  )
}

const events = [
  {
    date: '06-06',
    name: 'ETH somewhere',
    location: 'Somewhere',
    type: 'Meetup',
    team: 'ETH from somewhere',
    link: 'x.com/ethsomewhere',
  },
]

const EventsTable = () => {
  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-3xl font-bold text-center mb-4">Satellite Events</h2>
      <p className="text-center mb-6">
        The Ethereum community is organizing Devconnect Satellite Events. Join the Devconnect Satellite event near you.
      </p>
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-800">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Type of Event</th>
            <th className="px-4 py-2">Team</th>
            <th className="px-4 py-2">Link</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr key={index} className="bg-gray-700">
              <td className="border px-4 py-2">{event.date}</td>
              <td className="border px-4 py-2">{event.name}</td>
              <td className="border px-4 py-2">{event.location}</td>
              <td className="border px-4 py-2">{event.type}</td>
              <td className="border px-4 py-2">{event.team}</td>
              <td className="border px-4 py-2">
                <a
                  href={`https://${event.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:underline"
                >
                  {event.link}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-center mt-4">
        <button className="bg-yellow-500 text-white px-4 py-2 mx-2 rounded hover:bg-yellow-600">{'<'}</button>
        <button className="bg-yellow-500 text-white px-4 py-2 mx-2 rounded hover:bg-yellow-600">{'>'}</button>
      </div>
    </div>
  )
}

export default EventsTable
