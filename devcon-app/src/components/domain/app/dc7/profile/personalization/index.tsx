import React from 'react'
import Image from 'next/image'
import { Separator } from 'lib/components/ui/separator'
import { motion } from 'framer-motion'
import BellIcon from 'assets/icons/bell-simple.svg'
import { Toaster } from 'lib/components/ui/toaster'
import OnboardingPersonalization from 'assets/images/dc-7/onboarding-personalization.png'
import cn from 'classnames'
import { useZupass } from 'context/zupass'
import { useAccountContext } from 'context/account-context'

// This is the "personalization" onboarding step
export const Personalization = (props: any) => {
  const zupass = useZupass()
  const { account } = useAccountContext()
  const hasProfile = account?.roles && account?.since && account?.tracks
  const showProfile = zupass.publicKey || hasProfile

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
          Personalized Recommendations
        </motion.p>
        <motion.p className="text-[#939393] text-sm" variants={itemVariants}>
          Get personalized content recommendations! Tell us a bit about your interests, and we'll suggest talks,
          workshops and sessions tailored just for you to enhance your Devcon experience.
        </motion.p>
        {showProfile && (
          <>
            <motion.p className="text-[#7D52F4] text-sm" variants={itemVariants}>
              You've previously told us:
            </motion.p>
            <motion.p className="text-[#7D52F4] text-sm" variants={itemVariants}>
              {account?.roles && (
                <>
                  You're a{' '}
                  {account?.roles.length === 1
                    ? account.roles[0]
                    : `${account.roles.slice(0, -1).join(', ')} and ${account.roles.slice(-1)}`}
                </>
              )}
              {account?.since && <> with {new Date().getFullYear() - account?.since} years of experience, </>}
              {account?.tracks && (
                <>
                  interested in{' '}
                  {account?.tracks?.length
                    ? account.tracks.length === 1
                      ? account.tracks[0]
                      : `${account.tracks.slice(0, -1).join(', ')} and ${account.tracks.slice(-1)}`
                    : ''}
                </>
              )}
              .
            </motion.p>
          </>
        )}

        {!showProfile && (
          <>
            <motion.p className="text-[#7D52F4] text-sm" variants={itemVariants}>
              We don't have any information about you yet. Connect your Zupass for more personalized recommendations.
            </motion.p>
          </>
        )}
      </motion.div>
      <motion.div variants={itemVariants}>
        <Image
          src={OnboardingPersonalization}
          alt="Onboarding Personalization"
          className="w-full object-cover min-h-[200px] max-h-[30vh] rounded-xl lg:hidden my-2"
        />
      </motion.div>
      <>
        <Separator className="my-4" />

        <motion.p
          className="flex items-center justify-center lg:items-start text-sm semi-bold cursor-pointer w-full"
          variants={itemVariants}
          onClick={props.onSkip}
        >
          Edit personalized Settings
        </motion.p>
      </>

      <Toaster />
    </motion.div>
  )
}
