import { NextPage, GetServerSideProps } from 'next'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import DestinoHero from 'common/components/ba/destino/images/hero-bg.png'
import ArrowRight from 'assets/icons/arrow_right.svg'
import Link from 'common/components/link'

interface EventPageProps {
  event: string | string[] | undefined
  eventData: any
}

const EventPage: NextPage<EventPageProps> = ({ event, eventData }) => {
  return (
    <div className="text-black h-screen w-screen relative bg-black">
      <Image
        src={DestinoHero}
        alt="Destino Hero"
        className="w-full h-full absolute object-cover object-position opacity-60"
      />

      <Link href="/destino" className="absolute top-3 left-4 text-white !flex items-center gap-2 z-[11]">
        <div className="flex items-center gap-2">
          <ArrowRight className="rotate-180 icon text-sm" style={{ '--icon-color': 'white' } as React.CSSProperties} />{' '}
          View all Destino Devconnect events
        </div>
      </Link>
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden w-full max-w-[800px] shadow-lg border border-gray-600 border-solid">
          <div className="w-full aspect-[7/2] relativ">
            <Image src={DestinoHero} alt="Event Image" className="w-full h-full object-cover" />
          </div>
          <div className="p-6 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
              <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                {event}
              </span>
              <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {eventData?.when}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-2">{eventData?.title}</h1>
            <p className="text-lg text-gray-700 mb-4">{eventData?.description}</p>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z"
                  />
                </svg>
                <span className="font-medium">Where:</span> {eventData?.where}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A13.937 13.937 0 0112 15c2.485 0 4.797.607 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-medium">Who:</span> {eventData?.who}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getEvent = async (event: string) => {
  return {
    title: 'Pizza Party for the Ethereum inclined',
    description: 'Pizzaaaaaaaa',
    image: 'https://devconnect.org/og-argentina.png',
    when: '2024-01-01',
    where: 'Buenos Aires, Argentina',
    who: 'Argentinian Ethereum Wizards',
  }
}

export const getServerSideProps: GetServerSideProps = async context => {
  const { event } = context.params || {}

  const eventData = await getEvent(event as string)

  return {
    props: {
      event,
      eventData,
    },
  }
}

export default EventPage
