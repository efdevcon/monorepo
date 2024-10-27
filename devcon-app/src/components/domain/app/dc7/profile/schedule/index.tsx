import React from 'react'
import Image from 'next/image'
import { Separator } from 'lib/components/ui/separator'
import { motion } from 'framer-motion'
import BellIcon from 'assets/icons/bell-simple.svg'
import { Toaster } from 'lib/components/ui/toaster'
import { useToast } from 'lib/hooks/use-toast'
import OnboardingSchedule from 'assets/images/dc-7/onboarding-schedule.png'
import cn from 'classnames'

// This is the "schedule" onboarding step
export const Schedule = (props: any) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.div
        className={cn(
          'flex items-center justify-center p-4 mb-6 lg:mb-12 rounded-full bg-[#EFEBFF] h-[48px] w-[48px] lg:h-[64px] lg:w-[64px]',
          {
            '!mb-4': props.standalone,
            hidden: props.standalone,
          }
        )}
        variants={itemVariants}
      >
        <BellIcon style={{ '--color-icon': '#7D52F4' }} className="text-[20px] lg:text-[24px] icon" />
      </motion.div>
      <motion.div className="flex flex-col gap-2 mb-4" variants={itemVariants}>
        <motion.p className="font-xl semi-bold" variants={itemVariants}>
          Customize your schedule
        </motion.p>
        <motion.p className="text-[#939393] text-sm" variants={itemVariants}>
          Customize your event schedule to make the most of your experience—select your favorite talks, workshops, and
          activities to create a personalized agenda just for you. Share it with your colleagues and friends.
        </motion.p>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Image
          src={OnboardingSchedule}
          alt="Onboarding Schedule"
          className="w-full object-cover min-h-[200px] max-h-[30vh] rounded-xl lg:hidden my-2"
        />
      </motion.div>

      <Separator className="mt-12 mb-4" />

      <Toaster />
    </motion.div>
  )
}
