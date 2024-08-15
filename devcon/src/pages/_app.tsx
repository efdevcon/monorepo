import React from 'react'
import { IntlProvider } from 'next-intl'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'assets/css/index.scss'
import { SEO } from 'components/domain/seo'
import { init } from '@socialgouv/matomo-next'
import { SessionProvider } from 'next-auth/react'
import { Web3ModalProvider } from 'context/web3modal'
import { Link } from 'components/common/link'

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
  const [messages, setMessages] = React.useState<any>([])

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

      // const response = await (
      //   await fetch('http://localhost:4000/ai/devcon-website/ask', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({ query, threadID, messages }),
      //   })
      // ).json()

      // console.log(response, 'response')

      // const nextMessages = response.map((message: any) => {
      //   return {
      //     id: message,
      //     role: 'assistant',
      //     text: message.generated_text.split('[/INST]').pop().trim(),
      //   }
      // })

      // console.log(nextMessages, 'hello')

      // setMessages([
      //   ...messages,
      //   {
      //     // id: query,
      //     role: 'user',
      //     content: query,
      //   },
      //   {
      //     // id: Math.random(),
      //     role: 'assistant',
      //     content: response, // .generated_text.split('[/INST]').pop().trim(),
      //   },
      //   // ...nextMessages,
      // ])

      // console.log(resultTest, 'hello from backend')

      // return

      const result = await (
        await fetch(url, { method: 'POST', body: JSON.stringify({ message: query, threadID }) })
      ).json()

      // console.log(result, 'hello')

      // // add error case for run status not equal to whatever success string is from open ai

      setThreadID(result.threadID)
      setMessages(result.messages)
    } catch (e) {
      console.error(e, 'error')

      // @ts-ignore
      setError(e.message)
    }

    setExecutingQuery(false)
  }

  console.log(messages, 'messages')

  return (
    <>
      {visible && (
        <div className="fixed bottom-0 right-0 z-10 h-[75vh] w-[25vw] bg-slate-900 shadow-2xl p-4 text-white flex flex-col gap-4 items-start">
          <div className="shrink-0">DevAI chatbox</div>

          <div className="overflow-auto flex flex-col grow w-full gap-4">
            {messages.length > 0 &&
              messages.map((message: any, index: any) => {
                return (
                  <div key={index} className="shrink-0 flex flex-col">
                    <span className="text-sm opacity-50">
                      {message.role === 'assistant' ? 'DevAI responded' : 'You asked'}
                    </span>
                    {message.text}
                    {message.content}
                    {message.files.length > 0 && (
                      <div className="flex flex-col text-sm opacity-50 ">
                        <p className="mt-1">References</p>
                        <div className="flex gap-2">
                          {(() => {
                            // Sometimes multiple references go to the same page - this prevents rendering the same one more than once
                            const referencesTracker = {} as any

                            return message.files.map(({ file, fileUrl }: any, index: number) => {
                              if (referencesTracker[file.fileUrl]) return null

                              referencesTracker[file.fileUrl] = true

                              return (
                                <Link to={fileUrl} key={index}>
                                  https://devcon.org{fileUrl}
                                </Link>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )
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

      <IntlProvider messages={pageProps.messages} locale="en">
        <SessionProvider session={pageProps.session}>
          <Web3ModalProvider>
            <Component {...pageProps} />
          </Web3ModalProvider>
        </SessionProvider>
      </IntlProvider>

      <DevaBot />
    </>
  )
}

export default App
