import { Notifications } from 'components/domain/app/notifications'
import React, { useState } from 'react'
import Page from 'components/domain/app/dc7/page'
import { DotsSelector } from 'lib/components/dots-selector'

const NotificationsPage = (props: any) => {
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
          label: 'Notifications',
          href: '/notifications',
        },
      ]}
    >
      <div className="flex flex-col items-center mt-4">
        <DotsSelector items={notificationSteps} initialActiveIndex={currentStep} />
        <div className="mt-4">
          {/* Render different content based on currentStep */}
          {currentStep === 0 && <div>Content for Step 1</div>}
          {currentStep === 1 && <div>Content for Step 2</div>}
          {currentStep === 2 && <div>Content for Step 3</div>}
          {currentStep === 3 && <div>Content for Step 4</div>}
        </div>
      </div>
    </Page>
  )
}

export default NotificationsPage
