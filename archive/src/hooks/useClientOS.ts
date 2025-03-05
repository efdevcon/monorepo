import { useEffect, useState } from 'react'

interface ClientOS {
  userAgent: string
  isAndroid: boolean
  isIos: boolean
  isOpera: boolean
  isWindows: boolean
  isSSR: boolean
  isMobile: boolean
  isDesktop: boolean
}

export const useClientOS = () => {
  const [state, setState] = useState<ClientOS>()

  useEffect(() => {
    const userAgent = typeof navigator === 'undefined' ? 'SSR' : navigator.userAgent
    const isAndroid = Boolean(userAgent.match(/Android/i))
    const isIos = Boolean(userAgent.match(/iPhone|iPad|iPod/i))
    const isOpera = Boolean(userAgent.match(/Opera Mini/i))
    const isWindows = Boolean(userAgent.match(/IEMobile/i))
    const isSSR = Boolean(userAgent.match(/SSR/i))
    const isMobile = Boolean(isAndroid || isIos || isOpera || isWindows)
    const isDesktop = Boolean(!isMobile && !isSSR)

    setState({
      userAgent,
      isAndroid,
      isIos,
      isOpera,
      isWindows,
      isSSR,
      isMobile,
      isDesktop,
    })
  }, [])

  return state
}
