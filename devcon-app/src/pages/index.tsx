// import { Home } from 'components/domain/app/home'
import { AppLayout } from 'components/domain/app/Layout'
import React, { useState, useEffect } from 'react'
import { SEO } from 'components/domain/seo'
import { useSessionData } from 'services/event-data'
import { FancyLoader } from 'lib/components/loader/loader'
import { Dashboard } from 'components/domain/app/dc7/dashboard'
import AppIcon from 'assets/icons/app-tiles.svg'
import { useAccountContext } from 'context/account-context'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/router'
import Login from 'pages/login'
import { sessionsAtom } from './_app'
import { useRecoilValue } from 'recoil'
import Head from 'next/head'
import { cn } from 'lib/shadcn/lib/utils'

const Index = (props: any) => {
  const sessions = useRecoilValue(sessionsAtom)
  const accountContext = useAccountContext()
  const router = useRouter()
  // const [skipLogin, setSkipLogin] = useState(false)

  useEffect(() => {
    // Read skipLogin from localStorage on mount
    const storedSkipLogin = localStorage.getItem('skipLogin')

    if (storedSkipLogin !== 'true' && !accountContext.account) {
      router.replace('/login')
    }
  }, [])

  // TODO: Temporary test launch
  return <></>

  return (
    <AppLayout pageTitle="Dashboard" breadcrumbs={[{ label: 'Dashboard' }]}>
      <SEO title="Dashboard" />

      <Dashboard {...props} sessions={sessions} />

      <div
        className={cn(
          'fixed top-0 left-0 h-full w-full justify-center items-center opacity-90 bg-white z-5 pointer-events-none flex flex-col gap-2 transition-opacity duration-500',
          sessions && 'opacity-0'
        )}
      >
        <FancyLoader loading={!sessions} />
        Fetching schedule data...
      </div>
    </AppLayout>
  )
}

export default Index
