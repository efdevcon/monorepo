import React from 'react'
import { IntlProvider } from 'next-intl'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { SEO } from 'components/domain/seo'
import { init } from '@socialgouv/matomo-next'
import { SessionProvider } from 'next-auth/react'
import { Web3ModalProvider } from 'context/web3modal'

const MATOMO_URL = 'https://ethereumfoundation.matomo.cloud'
const MATOMO_SITE_ID = '8'
let matomoAdded = false

import DevaHead from 'assets/images/dc-7/deva-head.png'
import Image from 'next/image'
import { Button } from 'lib/components/button'

const DevaBot = () => {
  const [visible, setVisible] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [executingQuery, setExecutingQuery] = React.useState(false)
  const [error, setError] = React.useState('')
  const [threadID, setThreadID] = React.useState('')
  const [messages, setMessages] = React.useState([])

  React.useEffect(() => {
    setError('')
  }, [query])

  const reset = () => {
    setThreadID('')
    setMessages([])
  }

  const onSend = async () => {
    if (executingQuery) return

    setExecutingQuery(true)

    try {
      let url = '/api/ai'

      // if (threadID) {
      //   url += `?threadID=${threadID}`
      // }

      const result = await (
        await fetch(url, { method: 'POST', body: JSON.stringify({ message: query, threadID }) })
      ).json()

      console.log(result, 'hello')

      // add error case for run status not equal to whatever success string is from open ai

      setThreadID(result.threadID)
      setMessages(result.messages)
    } catch (e) {
      console.error(e, 'error')

      // @ts-ignore
      setError(e.message)
    }

    setExecutingQuery(false)
  }

  return (
    <>
      {visible && (
        <div className="fixed bottom-0 right-0 z-10 h-[75vh] w-[25vw] bg-slate-900 shadow-2xl p-4 text-white flex flex-col gap-4 items-start">
          <div className="shrink-0">Deva Bot Demo Interface</div>

          <div className="overflow-auto flex flex-col grow w-full gap-4">
            {messages.length > 0 &&
              messages.map((message: any) => {
                return <div key={message.id}>{message.text}</div>
              })}
          </div>

          <div className="shrink-0">
            <textarea className="text bg-slate-700" value={query} onChange={e => setQuery(e.target.value)}></textarea>

            {executingQuery && <div>Executing query...</div>}
            {error && <div className="text-red-500">{error}</div>}

            <div className="flex gap-2">
              <Button color="green-1" fill onClick={onSend} disabled={executingQuery}>
                Ask Deva
              </Button>

              <Button color="purple-1" fill disabled={executingQuery} onClick={reset}>
                Clear Chat
              </Button>
            </div>
          </div>
        </div>
      )}
      <div
        className="fixed bottom-4 right-4 z-10 rounded-full bg-slate-700 text-white p-3 w-24 h-24 flex flex-col items-center justify-center &:hover:bg-slate-800"
        onClick={() => setVisible(!visible)}
      >
        <Image src={DevaHead} alt="Deva Bot" className="object-contain" />
        <p className="mb-2">Ask Deva</p>
      </div>
    </>
  )
}

function App({ Component, pageProps }: any) {
  React.useEffect(() => {
    if (!matomoAdded && process.env.NODE_ENV === 'production') {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID })
      matomoAdded = true
    }
  }, [])

  return (
    <>
      <SEO />

<<<<<<< HEAD
      <NextIntlProvider messages={pageProps.messages}>
        <Component {...pageProps} />
      </NextIntlProvider>

      <DevaBot />
=======
      <IntlProvider messages={pageProps.messages} locale="en">
        <SessionProvider session={pageProps.session}>
          <Web3ModalProvider>
            <Component {...pageProps} />
          </Web3ModalProvider>
        </SessionProvider>
      </IntlProvider>
>>>>>>> main
    </>
  )
}

export default App
