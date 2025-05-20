import { NextPage } from 'next'
import Image from 'next/image'
import DestinoHero from 'common/components/ba/destino/images/hero-bg.png'
import DestinoLogo from 'common/components/ba/destino/images/destino-logo.png'
import { withTranslations } from 'pages/index'
import Link from 'common/components/link'
import moment from 'moment'
import { SEO } from 'common/components/SEO'
import IconTwitter from 'assets/icons/twitter.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'
import { Button } from 'lib/components/button'
import client from '../../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import styles from '../index.module.scss'
import { SOCIAL_HANDLE, FARCASTE_HANDLE } from 'common/constants'
interface EventPageProps {
  event: string | string[] | undefined
  eventData: any
}

const EventPage: NextPage<EventPageProps> = ({ event, eventData }) => {
  const currentUrl = `https://devconnect.org/destino/${event}?r=${Math.random().toString(36).substring(2, 8)}`

  const date = moment(eventData.date).format('MMMM D, YYYY')

  const twitterShare = encodeURIComponent(
    `Join us on the journey to ${SOCIAL_HANDLE} Buenos Aires!
    
${eventData.name} is taking place ${
      date !== 'Invalid date' ? `on ${date} ` : ''
    }as part of the Destino Devconnect series.
    
${currentUrl}`
  )
  const warpcastShare = `Join us on our journey to ${FARCASTE_HANDLE} Buenos Aires!%0A%0A${
    eventData.name
  } is taking place ${
    date !== 'Invalid date' ? `on ${date} ` : ''
  }as part of the Destino Devconnect series.%0A%0A${encodeURIComponent(
    currentUrl
  )}&channelKey=devconnect&embeds[]=${encodeURIComponent(currentUrl)}`

  let hasLink = eventData.link && eventData.link.startsWith('http')

  if (!hasLink && eventData.twitter_handle?.length) {
    eventData.link = `https://x.com/${eventData.twitter_handle.replace('@', '')}`
    hasLink = true
  }

  const imageUrl = eventData.image_url

  return (
    <div className="text-black relative bg-black min-w-[100vw] min-h-[100vh]">
      <SEO title={eventData.name} description={eventData.content} imageUrl={imageUrl} />

      <div className="fixed inset-0 z-0">
        <Image
          src={DestinoHero}
          alt="Destino Hero"
          fill
          className="w-full h-full object-cover object-position opacity-40"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center min-h-screen w-full px-4 py-4 md:py-8">
        <div className="mb-8 flex text-white flex-col text-xs text-center">
          <Link href="/destino">
            <Image src={DestinoLogo} alt="Destino Logo" className="object-cover w-[250px] max-w-[50vw] mx-auto" />
          </Link>
        </div>

        <div className="w-full max-w-[600px] mx-auto relative">
          <Link
            href="/destino"
            className="absolute -top-12 -left-2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
              <rect width="256" height="256" fill="none" />
              <polyline
                points="80 136 32 88 80 40"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
              />
              <path
                d="M80,200h88a56,56,0,0,0,56-56h0a56,56,0,0,0-56-56H32"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
              />
            </svg>
          </Link>
          <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-600 border-solid">
            <div className="w-full aspect-[1.91/1] relative">
              <Image
                src={imageUrl || DestinoHero}
                fill
                unoptimized
                alt="Event Image"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="py-4 px-6 flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4 mb-3">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 leading-tight">{eventData?.name}</h1>
              </div>
              <div className="flex flex-col min-[480px]:flex-row gap-2 items-start min-[480px]:items-center min-[480px]:justify-between mb-2">
                <div className="flex flex-col gap-1">
                  {eventData?.date && (
                    <span className="inline-flex items-center gap-1 text-gray-500 text-base font-medium">
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
                      {moment(eventData?.date).format('MMMM D, YYYY')}
                    </span>
                  )}
                  {eventData?.location && (
                    <span className="inline-flex items-center gap-1 text-gray-500 text-base font-medium">
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
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {eventData?.location}
                    </span>
                  )}
                </div>
                <div className="bg-black text-xs px-3 py-1 rounded-full shadow">
                  <span className={styles['rainbow-text']}>
                    {(globalThis as any).translations.destino_devconnect_event}
                  </span>
                </div>
              </div>
              <p className="mb-4 md:text-base text-gray-900">{eventData?.content}</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex flex-col min-[480px]:flex-row items-start min-[480px]:items-center gap-4 font-semibold justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{(globalThis as any).translations.destino_share_on}</span>
                    <a
                      className="twitter-share-button rounded-full bg-gray-100 w-[2em] h-[2em] flex items-center justify-center hover:bg-gray-200 transition-colors"
                      style={{ '--color-icon': '#8c72ae' } as any}
                      href={`https://x.com/intent/tweet?text=${twitterShare}`}
                      target="_blank"
                      rel="noreferrer"
                      data-size="large"
                      data-via="efdevcon"
                    >
                      <IconTwitter />
                    </a>
                    <a
                      className="rounded-full bg-gray-100 w-[2em] h-[2em] flex items-center justify-center hover:bg-gray-200 transition-colors"
                      style={{ '--color-icon': '#8c72ae' } as any}
                      href={`https://warpcast.com/~/compose?text=${warpcastShare}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <IconWarpcast />
                    </a>
                  </div>
                  {eventData?.twitter_handle && (
                    <Link
                      href={`https://x.com/${eventData.twitter_handle.replace('@', '')}`}
                      target="_blank"
                      className="text-gray-900 hover:text-gray-600 transition-colors"
                      indicateExternal
                    >
                      {eventData.twitter_handle.startsWith('@')
                        ? eventData.twitter_handle
                        : `@${eventData.twitter_handle}`}
                    </Link>
                  )}
                </div>
                <div className="flex justify-center mt-2">
                  {hasLink && (
                    <Link href={eventData.link} target="_blank">
                      <Button
                        color="black-1"
                        fat
                        fill
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-black font-semibold"
                      >
                        {(globalThis as any).translations.visit_event_website}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-white flex flex-col text-xs text-center">
          <div>
            {(globalThis as any).translations.destino_ai_generated}
            {hasLink && ' - ' + (globalThis as any).translations.destino_ai_generated_2}
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
    fallback: 'blocking',
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
