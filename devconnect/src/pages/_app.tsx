import React, { useState } from 'react'
import 'styles/globals.scss'
import type { AppProps } from 'next/app'
import { Roboto, Roboto_Condensed } from 'next/font/google'
import DevaBot from 'lib/components/ai/overlay'
import { Toaster } from 'sonner'
import DevconnectCubeLogo from 'assets/images/ba/cube-logo.png'
// import { AccountContextProvider } from 'context/account-context-provider'
// import { Web3Provider } from 'context/web3'
// import { DataProvider } from 'context/data'
// import { Toaster } from '@/components/ui/sonner'

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
import { init, push } from '@socialgouv/matomo-next'
import { useDevaBotStore } from 'store/devai'
import { useUrlParamsStore } from 'store/urlParams'
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
  const { setUtmParams } = useUrlParamsStore()

  React.useEffect(() => {
    // Parse UTM parameters from URL and localStorage
    if (typeof window !== 'undefined') {
      // First, try to load from localStorage (for persistence across refreshes)
      let storedParams: any = null
      try {
        const stored = localStorage.getItem('devconnect_utm_params')
        if (stored) {
          storedParams = JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error reading UTM params from localStorage:', error)
      }

      // Then check URL params (which take priority and can override stored params)
      const urlParams = new URLSearchParams(window.location.search)
      const mtm_campaign = urlParams.get('mtm_campaign')
      const mtm_kwd = urlParams.get('mtm_kwd')
      const mtm_content = urlParams.get('mtm_content')

      // If URL has UTM params, use those (and update localStorage)
      if (mtm_campaign || mtm_kwd || mtm_content) {
        const params = {
          ...(mtm_campaign && { mtm_campaign }),
          ...(mtm_kwd && { mtm_kwd }),
          ...(mtm_content && { mtm_content }),
        }
        
        // Store in Zustand
        setUtmParams(params)
        
        // Also store in localStorage for shared lib components
        localStorage.setItem('devconnect_utm_params', JSON.stringify(params))
      } 
      // Otherwise, if we have stored params, use those
      else if (storedParams) {
        setUtmParams(storedParams)
      }
    }
  }, [setUtmParams])

  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({
        url: MATOMO_URL,
        siteId: MATOMO_SITE_ID,
        onInitialization: () => {
          // Set cookie domain for subdomain tracking
          push(['setCookieDomain', '*.devconnect.org'])
          push(['setExcludedQueryParams', ['code', 'gist']])
        },
      })
      matomoAdded = true
    }
  }, [])

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          html {
            --font-roboto: ${roboto.style.fontFamily};
            --font-roboto-condensed: ${robotoCondensed.style.fontFamily};
          }
        `,
        }}
      />

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

      {/* <DataProvider> */}
      {/* <Web3Provider>
          <AccountContextProvider> */}
      <Component {...pageProps} />
      {/* </AccountContextProvider>
        </Web3Provider> */}
      {/* </DataProvider> */}
      <Toaster />
    </>
  )
}

export default MyApp
