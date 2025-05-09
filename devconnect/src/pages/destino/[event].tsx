import { NextPage } from 'next'
import Image from 'next/image'
import DestinoHero from 'common/components/ba/destino/images/hero-bg.png'
import DestinoLogo from 'common/components/ba/destino/images/destino-logo.png'
import { withTranslations } from 'pages/index'
import Link from 'common/components/link'
import moment from 'moment'
import { SEO } from 'common/components/SEO'
import Tilty from 'react-tilty'
import IconTwitter from 'assets/icons/twitter.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'
import { Button } from 'lib/components/button'
import client from '../../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
interface EventPageProps {
  event: string | string[] | undefined
  eventData: any
}

const EventPage: NextPage<EventPageProps> = ({ event, eventData }) => {
  const currentUrl = `https://devconnect.org/destino/${event}`

  const twitterShare = encodeURIComponent(
    `Join us on the journey to Devconnect Buenos Aires!
    
${eventData.name} is taking place on ${moment(eventData.date).format(
      'MMMM D, YYYY'
    )} as part of the Destino Devconnect series.
    
${currentUrl}`
  )
  const warpcastShare = `Join us on our journey to Devconnect Buenos Aires!%0A%0A${
    eventData.name
  } is taking place on ${moment(eventData.date).format(
    'MMMM D, YYYY'
  )} as part of the Destino Devconnect series.%0A%0A${encodeURIComponent(
    currentUrl
  )}&channelKey=devconnect&embeds[]=${encodeURIComponent(currentUrl)}`

  const hasLink = eventData.link && eventData.link.startsWith('http')

  return (
    <div className="text-black h-screen w-screen relative bg-black">
      <SEO title={eventData.name} description={eventData.content} imageUrl={eventData.image_url} />

      <Image
        src={DestinoHero}
        alt="Destino Hero"
        fill
        className="w-full h-full absolute object-cover object-position opacity-40"
      />

      <div className="relative z-10 flex flex-col items-center sm:justify-center h-full w-full px-4">
        <div className="mb-2 md:mb-4 hidden sm:flex text-white flex-col text-xs text-center relative">
          <Image
            src={DestinoLogo}
            alt="Destino Logo"
            className="object-cover w-[250px] max-w-[70vw] absolute hidden sm:block top-0 translate-y-[calc(-100%-24px)] left-1/2 -translate-x-1/2"
          />
          <Link href="/destino" className="" indicateExternal style={{ '--icon-color': 'white' }} target="_blank">
            {(globalThis as any).translations.this_is_a_destino_devconnect_event}
          </Link>
        </div>
        <Tilty
          className="max-w-full relative contents md:block"
          style={{ transformStyle: 'preserve-3d' }}
          speed={5000}
          reverse
        >
          <div className="flex flex-col bg-white rounded-2xl overflow-hidden w-full max-w-[800px] shadow-lg border border-gray-600 border-solid mt-4 mb-0 sm:mt-0 ">
            <div className="w-full aspect-[7/2] relative">
              <Image
                src={eventData.image_url || DestinoHero}
                fill
                alt="Event Image"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="py-4 px-6 flex flex-col">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 leading-tight">{eventData?.name}</h1>
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
                  {eventData?.location}
                </span>
              </div>
              <p className="mb-4 text-xs md:text-base">{eventData?.content}</p>
              <div className="flex flex-col sm:flex-row gap-4 text-sm justify-between">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1 ">{moment(eventData?.date).format('MMMM D, YYYY')}</div>

                  <div className="flex items-center gap-1 font-semibold">
                    {eventData?.twitter_handle.startsWith('@')
                      ? eventData?.twitter_handle
                      : `@${eventData?.twitter_handle}`}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full shadow self-start">
                  {(globalThis as any).translations.destino_devconnect_event}
                </div>
              </div>
            </div>
          </div>
        </Tilty>
        <div className="mt-2 md:mt-4 text-white flex flex-col text-xs text-center relative">
          {hasLink && (
            <Link href={eventData.link} target="_blank">
              <Button
                className="object-cover w-[250px] max-w-[70vw] absolute bottom-0 translate-y-[calc(100%+8px)] md:translate-y-[calc(100%+24px)] left-1/2 -translate-x-1/2"
                color="white-1"
                fat
                fill
                size="sm"
              >
                {(globalThis as any).translations.visit_event_website}
              </Button>
            </Link>
          )}

          <div>
            {(globalThis as any).translations.destino_ai_generated}
            {hasLink && ' - ' + (globalThis as any).translations.destino_ai_generated_2}
          </div>
        </div>

        <div className="flex flex-col items-center mb-4 absolute bottom-0 margin-auto z-10">
          <p className="text-sm mb-2 text-white">{(globalThis as any).translations.destino_share_on}</p>
          <div className="flex gap-4">
            <a
              // className="twitter-share-button"
              className="twitter-share-button rounded-full bg-white w-[2em] h-[2em] flex items-center justify-center"
              // @ts-ignore
              style={{ '--color-icon': '#8c72ae' }}
              href={`https://x.com/intent/tweet?text=${twitterShare}`}
              target="_blank"
              rel="noreferrer"
              // data-url={currentUrl}
              data-size="large"
              data-via="efdevcon"
            >
              <IconTwitter />
            </a>
            <a
              className="rounded-full bg-white w-[2em] h-[2em] flex items-center justify-center "
              // @ts-ignore
              style={{ '--color-icon': '#8c72ae' }}
              href={`https://warpcast.com/~/compose?text=${warpcastShare}`}
              target="_blank"
              rel="noreferrer"
            >
              <IconWarpcast />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export const getStaticPaths = async ({ locales }: { locales: string[] }) => {
  const eventsResponse = await fetch(
    process.env.NODE_ENV === 'development' ? `http://localhost:4000/destino` : `https://api.devcon.org/destino`
  )

  const events = await eventsResponse.json()

  const paths = locales.flatMap(locale =>
    events.map((event: any) => ({
      params: { event: `${encodeURIComponent(event.name).replace(/%20/g, '-')}-${encodeURIComponent(event.event_id)}` },
      locale,
    }))
  )

  return {
    paths,
    fallback: 'blocking', // Show a fallback page while generating new pages
  }
}

export async function getStaticProps({ params, locale }: { params: { event: string }; locale: string }) {
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })
  const event = decodeURIComponent(params.event).split('-').pop()

  const eventDataResponse = await fetch(
    process.env.NODE_ENV === 'development'
      ? `http://localhost:4000/destino/${event}`
      : `https://api.devcon.org/destino/${event}`
  )

  const eventData = await eventDataResponse.json()

  return {
    props: {
      translations,
      event: params.event,
      eventData: {
        ...eventData,
        content: eventData.content[locale || 'en'],
      },
    },
    revalidate: 60 * 60 * 1, // Revalidate every 8 hours, just being conservative to avoid rate limiting issues as there may be a lot of events
  }
}

export default withTranslations(EventPage)
