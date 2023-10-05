import 'styles/globals.scss'
import type { AppProps } from 'next/app'
import { Roboto, Roboto_Condensed } from 'next/font/google'
export const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700'], display: 'swap' })
export const robotoCondensed = Roboto_Condensed({ subsets: ['latin'], weight: ['400', '700'] })

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
  return (
    <>
      <style jsx global>{`
        html {
          --font-roboto: ${roboto.style.fontFamily};
          --font-roboto-condensed: ${robotoCondensed.style.fontFamily};
        }
      `}</style>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
