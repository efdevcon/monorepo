import React from 'react'
import { IntlProvider } from 'next-intl'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { SEO } from 'components/domain/seo'
import { init } from '@socialgouv/matomo-next'
// import { SessionProvider } from 'next-auth/react'
// import { Web3ModalProvider } from 'context/web3modal'
import { RecoilRoot } from 'recoil'
// import DevaBot from 'lib/components/ai/overlay'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { TICKETING_ENV, TICKETING } from 'config/ticketing'
import { AiTranslationBanner } from 'components/common/ai-translation-banner/AiTranslationBanner'
import enCommon from '../../content/en/intl/common.json'
import enHome from '../../content/en/intl/home.json'
import enDips from '../../content/en/intl/dips.json'
import enPastEvents from '../../content/en/intl/past_events.json'
import enEcosystemProgram from '../../content/en/intl/ecosystem_program.json'
import enBlogs from '../../content/en/intl/blogs.json'
import enLantern from '../../content/en/intl/lantern.json'
import enTickets from '../../content/en/intl/tickets.json'
import enApplications from '../../content/en/intl/applications.json'
import enAbout from '../../content/en/intl/about.json'
import hiCommon from '../../content/hi/intl/common.json'
import hiHome from '../../content/hi/intl/home.json'
import hiDips from '../../content/hi/intl/dips.json'
import hiPastEvents from '../../content/hi/intl/past_events.json'
import hiEcosystemProgram from '../../content/hi/intl/ecosystem_program.json'
import hiBlogs from '../../content/hi/intl/blogs.json'
import hiLantern from '../../content/hi/intl/lantern.json'
import hiTickets from '../../content/hi/intl/tickets.json'
import hiApplications from '../../content/hi/intl/applications.json'
import hiAbout from '../../content/hi/intl/about.json'
import mrCommon from '../../content/mr/intl/common.json'
import mrHome from '../../content/mr/intl/home.json'
import mrDips from '../../content/mr/intl/dips.json'
import mrPastEvents from '../../content/mr/intl/past_events.json'
import mrEcosystemProgram from '../../content/mr/intl/ecosystem_program.json'
import mrBlogs from '../../content/mr/intl/blogs.json'
import mrLantern from '../../content/mr/intl/lantern.json'
import mrTickets from '../../content/mr/intl/tickets.json'
import mrApplications from '../../content/mr/intl/applications.json'
import mrAbout from '../../content/mr/intl/about.json'

const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = '8'
let matomoAdded = false

const MESSAGES: Record<string, Record<string, any>> = {
  en: {
    common: enCommon,
    home: enHome,
    dips: enDips,
    past_events: enPastEvents,
    ecosystem_program: enEcosystemProgram,
    blogs: enBlogs,
    lantern: enLantern,
    tickets: enTickets,
    applications: enApplications,
    about: enAbout,
  },
  hi: {
    common: hiCommon,
    home: hiHome,
    dips: hiDips,
    past_events: hiPastEvents,
    ecosystem_program: hiEcosystemProgram,
    blogs: hiBlogs,
    lantern: hiLantern,
    tickets: hiTickets,
    applications: hiApplications,
    about: hiAbout,
  },
  mr: {
    common: mrCommon,
    home: mrHome,
    dips: mrDips,
    past_events: mrPastEvents,
    ecosystem_program: mrEcosystemProgram,
    blogs: mrBlogs,
    lantern: mrLantern,
    tickets: mrTickets,
    applications: mrApplications,
    about: mrAbout,
  },
}

function App({ Component, pageProps }: any) {
  const router = useRouter()
  const isStorePage = router.pathname.startsWith('/tickets/store')

  const rawLocale = router.locale ?? 'en'
  const normalizedLocale = rawLocale === 'default' ? 'en' : rawLocale
  // Per-page getStaticProps can still provide its own `messages` (useful for overriding
  // or future server-side composition); otherwise fall back to the statically-imported bundle.
  const messages = pageProps?.messages ?? MESSAGES[normalizedLocale] ?? MESSAGES.en

  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <RecoilRoot>
        <SEO />
        {isStorePage && (TICKETING_ENV !== 'production' || TICKETING.pretix.testmode) && (
          <div className="fixed bottom-3 right-3 z-[9999] flex flex-row items-center gap-1.5 pointer-events-none whitespace-nowrap">
            {(TICKETING_ENV !== 'production' || TICKETING.pretix.testmode) && (
              <div className="bg-[#f59e0b] text-black font-bold rounded-lg opacity-90 text-[11px] sm:text-base px-2 py-1 sm:px-4 sm:py-2">
                {new URL(TICKETING.pretix.baseUrl).hostname.split('.')[0]} Pretix
              </div>
            )}
            {TICKETING.pretix.testmode && (
              // Testmode is a Pretix flag, independent of TICKETING_ENV — surface
              // it loudly so an operator who left testmode on in production sees
              // it next to a real Stripe/x402 charge attempt.
              <div className="bg-[#dc2626] text-white font-bold rounded-lg opacity-90 tracking-wider text-[11px] sm:text-base px-2 py-1 sm:px-4 sm:py-2">
                TEST MODE - real crypto charges
              </div>
            )}
          </div>
        )}

        <IntlProvider messages={messages} locale={normalizedLocale}>
          {/* <SessionProvider session={pageProps.session}> */}
          {/* <Web3ModalProvider> */}
          <Component {...pageProps} />
          <AiTranslationBanner />
          {/* </Web3ModalProvider> */}
          {/* </SessionProvider> */}
        </IntlProvider>
      </RecoilRoot>
    </>
  )
}

export default App
