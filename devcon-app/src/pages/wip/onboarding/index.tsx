import { Notifications } from 'components/domain/app/dc7/profile/notifications'
import React, { useState } from 'react'
import Page from 'components/domain/app/dc7/page'
import { DotsSelector } from 'lib/components/dots-selector'
import OnboardingNotifications from 'assets/images/dc-7/onboarding-notifications.png'
import OnboardingZupass from 'assets/images/dc-7/onboarding-zupass.png'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

const OnboardingPage = (props: any) => {
  const [currentStep, setCurrentStep] = useState(0)

  const notificationSteps = [
    {
      label: 'Step 1',
      onClick: () => {
        console.log('Navigating to Step 1')
        setCurrentStep(0)
      },
    },
    {
      label: 'Step 2',
      onClick: () => {
        console.log('Navigating to Step 2')
        setCurrentStep(1)
      },
    },
    {
      label: 'Step 3',
      onClick: () => {
        console.log('Navigating to Step 3')
        setCurrentStep(2)
      },
    },
    {
      label: 'Step 4',
      onClick: () => {
        console.log('Navigating to Step 4')
        setCurrentStep(3)
      },
    },
  ]

  return (
    <Page
      breadcrumbs={[
        {
          label: 'Profile',
          href: '/profile',
        },
        {
          label: 'Onboarding',
          href: '/wip/onboarding',
        },
        {
          label: (() => {
            switch (currentStep) {
              case 0:
                return 'Notifications'
              case 1:
                return 'Zupass'
              case 2:
                return 'Preferences'
              case 3:
                return 'Enjoy the app!'
              default:
                return ''
            }
          })(),
          // href: '/wip/onboarding',
        },
      ]}
      rightContent={
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            {(() => {
              switch (currentStep) {
                case 0:
                  return (
                    <Image
                      src={OnboardingNotifications}
                      alt="Notifications Illustration"
                      className="w-full h-full object-cover object-center"
                    />
                  )
                case 1:
                  return (
                    <Image
                      src={OnboardingZupass}
                      alt="Zupass Illustration"
                      className="w-full h-full object-cover object-center"
                    />
                  )
                case 2:
                  return (
                    <Image
                      src={OnboardingNotifications}
                      alt="Preferences Illustration"
                      className="w-full h-full object-cover object-center"
                    />
                  )
                case 3:
                  return (
                    <Image
                      src={OnboardingZupass}
                      alt="Enjoy the App Illustration"
                      className="w-full h-full object-cover object-center"
                    />
                  )
                default:
                  return null
              }
            })()}
          </motion.div>
        </AnimatePresence>
      }
    >
      <div>
        {currentStep === 0 && <Notifications onSkip={() => setCurrentStep(1)} />}
        {currentStep === 1 && <div>Content for Step 2</div>}
        {currentStep === 2 && <div>Content for Step 3</div>}
        {currentStep === 3 && <div>Content for Step 4</div>}
      </div>
      <div className="flex mt-4">
        <DotsSelector
          items={notificationSteps}
          initialActiveIndex={currentStep}
          activeIndex={currentStep}
          onActiveIndexChange={setCurrentStep}
        />
      </div>
    </Page>
  )
}

export default OnboardingPage
