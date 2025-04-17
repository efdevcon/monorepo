import React, { useState } from 'react'
import 'styles/globals.scss'
import type { AppProps } from 'next/app'
import { Roboto, Roboto_Condensed } from 'next/font/google'
import DevaBot from 'lib/components/ai/overlay'
import DevconnectCubeLogo from 'assets/images/ba/cube-logo.png'
export const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['400', '500', '700'],
  display: 'swap',
})
export const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  variable: '--font-roboto-condensed',
  weight: ['400', '700'],
})
import { init } from '@socialgouv/matomo-next'
import { useDevaBotStore } from 'store/devai'
const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = '29'
let matomoAdded = false

// Safari 100vh works poorly - this is the workaround
if (typeof window !== 'undefined') {
  const appHeight = () => {
    const doc = document.documentElement
    doc.style.setProperty('--viewport-height', `${window.innerHeight}px`)
  }

  window.addEventListener('resize', appHeight)
  window.addEventListener('orientationchange', appHeight)

  appHeight()
}

function MyApp({ Component, pageProps }: AppProps) {
  const [showBanner, setShowBanner] = useState(true)
  const { visible, toggleVisible } = useDevaBotStore()

  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  return (
    <>
      <style jsx global>{`
        html {
          --font-roboto: ${roboto.style.fontFamily};
          --font-roboto-condensed: ${robotoCondensed.style.fontFamily};
        }
      `}</style>

      <DevaBot
        botVersion="devconnect"
        toggled={visible}
        onToggle={toggleVisible}
        logo={DevconnectCubeLogo}
        logoClassName="!w-[40px]"
      />

      {/* <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            transition={{ duration: 1 }}
            className="fixed top-4 pointer-events-none flex left-0 right-0 justify-center items-center text-black text-center z-50 rounded-md mx-4"
          >
            <div className="flex flex-wrap justify-center gap-2 items-center bg-white shadow-md pointer-events-auto p-2.5 rounded-md">
              <p>
                Devcon is happening on November 12-15! Learn more on{' '}
                <Link href="https://devcon.org" className="underline">
                  devcon.org
                </Link>
                .
              </p>
              <Button className="" color="black-1" fill onClick={() => setShowBanner(false)}>
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence> */}

      <Component {...pageProps} />
    </>
  )
}

export default MyApp
