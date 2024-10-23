import React from 'react'
import { usePageContext } from 'context/page-context'
import Image from 'next/image'
import { Button } from 'lib/components/button'
import { Separator } from 'lib/components/ui/separator'
import { motion } from 'framer-motion'
import ZupassIcon from 'assets/icons/zupass.svg'
import OnboardingZupass from 'assets/images/dc-7/onboarding-zupass.png'
import { Toaster } from 'lib/components/ui/toaster'
import { useToast } from 'lib/hooks/use-toast'
import { useZupass } from 'context/zupass'

export const Zupass = (props: any) => {
  const { loading, error, publicKey, Connect, GetTicket } = useZupass()

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
        className="flex items-center justify-center p-4 mb-6 lg:mb-12 rounded-full bg-[#EFEBFF] h-[48px] w-[48px] lg:h-[64px] lg:w-[64px]"
        variants={itemVariants}
      >
        <ZupassIcon
          style={{ '--color-icon': '#7D52F4' }}
          className="text-[20px] lg:text-[28px] icon border-[1px] border-[#7D52F4] border-solid rounded-full p-[1px]"
        />
      </motion.div>
      <motion.div className="flex flex-col gap-2 mb-4" variants={itemVariants}>
        <motion.p className="font-xl semi-bold" variants={itemVariants}>
          Connect your Zupass
        </motion.p>
        <motion.p className="text-[#939393] text-sm" variants={itemVariants}>
          To import your Visual Ticket, Swag items, and unlock unique experiences made available through Zupass at
          Devcon.
        </motion.p>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Image
          src={OnboardingZupass}
          alt="Onboarding Notifications"
          className="w-full object-cover min-h-[200px] max-h-[30vh] rounded-xl lg:hidden my-2"
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        <Button className="plain mt-2 lg:mt-8 w-full" color="purple-2" fat fill onClick={Connect} disabled={publicKey}>
          {publicKey ? 'Already connected' : 'Connect Zupass'}
        </Button>
      </motion.div>

      {props.onSkip && (
        <>
          <Separator className="my-4" />

          <motion.p
            className="flex items-center justify-center lg:items-start text-sm semi-bold cursor-pointer w-full"
            variants={itemVariants}
            onClick={props.onSkip}
          >
            {publicKey ? 'Continue' : 'Not right now'}
          </motion.p>
        </>
      )}

      <Toaster />
    </motion.div>
  )
}
