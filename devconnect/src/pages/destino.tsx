import React, { useEffect } from 'react'
import Destino from 'common/components/ba/destino/destino'
import { Footer, Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import { SEO } from 'common/components/SEO'
import { useRouter } from 'next/router'

const DestinoPage = ({ content, events }: { content: any; events: any }) => {
  const { data }: { data: any } = useTina(content)
  const router = useRouter()

  useEffect(() => {
    // Remove any scroll event listeners that might interfere
    const removeScrollListeners = () => {
      const oldWheel = window.onwheel
      const oldTouchMove = window.ontouchmove
      window.onwheel = null
      window.ontouchmove = null
      return () => {
        window.onwheel = oldWheel
        window.ontouchmove = oldTouchMove
      }
    }

    // Remove overscroll-none class if it exists
    document.body.classList.remove('overscroll-none')

    // Enable scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'auto'
    }

    // If there's a hash in the URL, let the browser handle the scroll
    if (router.asPath.includes('#')) {
      return
    }

    // If coming from a navigation (not a fresh load), restore scroll position
    if (router.isReady && !router.isPreview) {
      const scrollPosition = sessionStorage.getItem('scrollPosition')
      if (scrollPosition) {
        window.scrollTo(0, parseInt(scrollPosition))
      }
    }

    // Save scroll position before unload
    const handleBeforeUnload = () => {
      sessionStorage.setItem('scrollPosition', window.scrollY.toString())
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    const cleanup = removeScrollListeners()

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      cleanup()
    }
  }, [router.isReady, router.asPath])

  return (
    <>
      <SEO
        title="Destino Devconnect Support"
        description="Supporting local builders, organizers, and communities to take part in the first Ethereum World Fair in Buenos Aires."
        imageUrl={`https://devconnect.org/destino/hero-bg.png`}
      />
      <Header active />
      <Destino content={data.pages} events={events} />
      <Footer />
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const path = locale === 'en' ? 'destino_devconnect.mdx' : locale + '/destino_devconnect.mdx'
  const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  const eventsResponse = await fetch(
    process.env.NODE_ENV === 'development' ? `http://localhost:4000/destino` : `https://api.devcon.org/destino`
  )

  const events = await eventsResponse.json()

  return {
    props: {
      translations,
      locale,
      content,
      events,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(DestinoPage)
