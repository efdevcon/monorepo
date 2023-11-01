import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'

type HistoryTrackerProps = {
  children?: any
}

const Context = createContext<boolean>(false)

export const useHistory = () => {
  return useContext(Context)
}

export const HistoryTracker = (props: HistoryTrackerProps) => {
  // const [currentRoute, setCurrentRoute] = useState<string | null>(null)
  // const [initialHistoryState, setInitialHistoryState] = useState<number>(0)
  const [canBack, setCanBack] = useState(false)
  // We count depth once we are inside /app, adding and subtracting as we go forward or backwards in history
  // When depth is 1 and we pop state, it means we are at the initial route, and there is nothing to go back to within the context of the app, meaning we can set the history to null
  const router = useRouter()

  // console.log(depth, 'depthe')

  // console.log(typeof window !== undefined && window.history.length, 'length hist')
  // useEffect(() => {
  //   console.log(window.history.length, 'length hist')
  // }, [depth])

  // useEffect(() => {
  //   const handler = () => {
  //     console.log(window.history.length, 'history length')
  //   }

  //   // window.onpopstate = () => console.log('hlelo wtf')
  //   // window.onpushtate = handler;

  //   window.addEventListener('popstate', handler)
  //   window.addEventListener('pushstate', handler)
  //   addEventListener('hashchange', handler)

  //   return () => {
  //     window.removeEventListener('popstate', handler)
  //     window.removeEventListener('pushstate', handler)
  //     window.removeEventListener('hashchange', handler)
  //   }
  // }, [])
  // useEffect(() => {
  //   history.replaceState({ page: history.length, href: location.href }, 'foo')
  //   // initialPage.current = history.length
  // }, [])

  // useEffect(() => {
  //   if (!initialHistoryState && currentRoute) {
  //     console.log('replacing state')
  //     const timeOfNav = Date.now()
  //     console.log(history.state, 'before')
  //     history.replaceState({ ...history.state, initialState: timeOfNav }, 'foo')
  //     setInitialHistoryState(timeOfNav)
  //     setCanBack(false)

  //     console.log(history.state, 'state')
  //   }
  // }, [initialHistoryState, currentRoute])

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // const isBackNavigation = url.includes(prevRoute || 'aæ.æeaæ.') // === router.pathname

      // console.log(history.state, initialHistoryState, 'hello x2')

      if (history.state.idx === 0) {
        setCanBack(false)
      } else {
        setCanBack(true)
      }

      // if (history.state.initialState === initialHistoryState) {
      //   setCanBack(false)
      // } else {
      //   setCanBack(true)
      // }

      // setCurrentRoute(url)

      // setCurrentHistoryState(timeOfNav)

      // initialHistoryState === history.state.initialState;

      // console.log(url)

      // if (history.state.page === initialPage.current) {
      //   console.log('supposedly at the first page now')
      // } else {
      //   console.log(history.length, 'length')
      // }

      // // console.log(window.state.page === 1, 'length of hist')
      // if (isBackNavigation) {
      //   setDepth(depth => depth - 1)
      // } else {
      //   setDepth(depth => depth + 1)
      // }

      // setPrevRoute(url)

      // console.log(isBackNavigation, 'is back nav')

      // if (router.pathname.startsWith('/app')) {
      //   setPrevRoute(router.pathname)
      // } else {
      //   setDepth(0)

      //   return
      // }

      // if (true /*isBackNavigation*/) {
      //   setDepth(depth => depth - 1)
      // } else {
      //   setDepth(depth => depth + 1)
      // }
    }

    // router.beforePopState(() => {
    //   console.log('pop state')
    //   setDepth(depth => depth - 2) // if we're going back in history, we have to overcompensate because we are incrementing the counter in the routeChange handler

    //   return true
    // })

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // const cantNavigate = initialHistoryState === history.state.initialState

  // console.log(canBack, 'cant navigate')

  // console.log(depth, 'depth')

  return <Context.Provider value={canBack || true}>{props.children}</Context.Provider>
}
