import { Notifications } from 'components/domain/app/dc7/profile/notifications'
import { Zupass } from 'components/domain/app/dc7/profile/zupass'
import React, { useState } from 'react'
import Page from 'components/domain/app/dc7/page'
import { DotsSelector } from 'lib/components/dots-selector'
import OnboardingNotifications from 'assets/images/dc-7/onboarding-notifications.png'
import OnboardingZupass from 'assets/images/dc-7/onboarding-zupass.png'
import OnboardingSchedule from 'assets/images/dc-7/onboarding-schedule.png'
import OnboardingPersonalization from 'assets/images/dc-7/onboarding-personalization.png'
import Image from 'next/image'
import ChevronRightIcon from 'assets/icons/chevron_right.svg'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from 'lib/components/button'
import { Schedule } from 'components/domain/app/dc7/profile/schedule'
import { Personalization } from 'components/domain/app/dc7/profile/personalization'
import router from 'next/router'

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
          href: '/onboarding',
        },
        {
          label: (() => {
            switch (currentStep) {
              case 0:
                return 'Notifications'
              case 1:
                return 'Zupass'
              case 2:
                return 'Schedule'
              case 3:
                return 'Personalization'
              case 4:
                return 'Enjoy the app!'
              default:
                return ''
            }
          })(),
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
                      src={OnboardingSchedule}
                      alt="Schedule Illustration"
                      className="w-full h-full object-cover object-center"
                    />
                  )
                case 3:
                  return (
                    <Image
                      src={OnboardingPersonalization}
                      alt="Personalization Illustration"
                      className="w-full h-full object-cover object-center"
                    />
                  )
                case 4:
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
        {currentStep === 1 && <Zupass onSkip={() => setCurrentStep(2)} />}
        {currentStep === 2 && <Schedule onSkip={() => setCurrentStep(3)} />}
        {currentStep === 3 && <Personalization onSkip={() => router.push('/account')} />}
      </div>
      <div className="flex justify-between items-center mt-4">
        <DotsSelector
          items={notificationSteps}
          initialActiveIndex={currentStep}
          activeIndex={currentStep}
          onActiveIndexChange={setCurrentStep}
        />

        {/* <Button className="plain" color="purple-2" rounded fat fill>
          <ChevronRightIcon className="text-xs" style={{ '--color-icon': '#7D52F4', fontSize: '10px' }} />
        </Button> */}

        <div
          className="rounded-full bg-[#EFEBFF] text-[#7D52F4] flex items-center justify-center text-xs p-3 gap-2 cursor-pointer hover:scale-110 transition-all duration-500 border border-[#7D52F4 select-none"
          onClick={() => setCurrentStep(currentStep === 3 ? 0 : currentStep + 1)}
        >
          <ChevronRightIcon className="text-xs" style={{ '--color-icon': '#7D52F4', fontSize: '12px' }} />
        </div>
      </div>
    </Page>
  )
}

export default OnboardingPage
