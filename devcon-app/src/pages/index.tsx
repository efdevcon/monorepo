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

  return (
    <AppLayout pageTitle="Dashboard" breadcrumbs={[{ label: 'icon', icon: AppIcon }, { label: 'Dashboard' }]}>
      <SEO title="Dashboard" />

      <Dashboard {...props} sessions={sessions} />

      <div className="fixed top-0 h-full w-full flex justify-center items-center opacity-100 z-5 pointer-events-none">
        <FancyLoader loading={!sessions} />
      </div>
    </AppLayout>
  )
}

export default Index
