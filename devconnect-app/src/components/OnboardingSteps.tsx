import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import ChevronRightIcon from 'assets/icons/chevron_right.svg'
import { ChevronRightIcon } from 'lucide-react';
import { DotsSelector } from 'lib/components/dots-selector';
// import { Button } from './ui/button';
import CommunityEventsImage from '@/images/onboarding-steps/community-events-wide.jpg';
import WorldsFairImage from '@/images/onboarding-steps/worlds-fair-image-wide.jpg';
import EthDayImage from '@/images/onboarding-steps/eth-day-image-wide.jpg';
import Image from 'next/image';
import Button from 'lib/components/voxel-button/button';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import CupIcon from './icons/onboarding-steps/cup.svg';
import LuggageIcon from './icons/onboarding-steps/luggage.svg';
import MicrophoneIcon from './icons/onboarding-steps/microphone.svg';
import PhoneIcon from './icons/onboarding-steps/phone.svg';
import RocketIcon from './icons/onboarding-steps/rocket.svg';
import Lottie from 'lottie-react';
import WalletConnectedAnimation from '@/images/Wallet-Connected.json';
interface OnboardingStepsProps {
  steps?: React.ReactNode[];
  rightContent?: React.ReactNode[];
}

const Slide = ({
  title,
  description,
  image,
}: {
  title: string;
  description: any;
  image: any;
}) => {
  return (
    <div className="flex flex-col">
      <div className="aspect-[480/194] relative w-full">
        <Image
          src={image}
          alt="voxel art"
          // width={480}
          placeholder="blur"
          // height={194}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="mt-5 leading-tight">
        <div className="text-xl font-semibold leading-tight mb-2 ">{title}</div>
        {description}
      </div>
    </div>
  );
};

const Block = ({
  icon,
  description,
}: {
  icon: React.ReactNode;
  description: React.ReactNode;
}) => {
  return (
    <div className="flex p-2 px-3 sm:p-4 w-full gap-4 bg-white items-center">
      <div className="shrink-0 flex items-center justify-center">{icon}</div>
      <div className="grow text-xs md:text-base leading-tight">
        {description}
      </div>
    </div>
  );
};

const defaultSteps = [
  <div key="step0" className="flex flex-col items-center text-center">
    <div className="aspect-[480/480] relative w-full mb-6">
      <Lottie
        animationData={WalletConnectedAnimation}
        loop={false}
        className="w-full h-full object-contain mix-blend-multiply max-w-[300px]"
      />
    </div>
    <div className="leading-tight">
      <div className="text-xl font-semibold leading-tight mb-2">
        Your wallet is connected!
      </div>
      <div className="text-sm sm:text-base">
        Final steps: let's learn about the World's Fair!
      </div>
    </div>
  </div>,
  <Slide
    key="step1"
    title="Welcome to Devconnect ARG: the first Ethereum World's Fair"
    image={WorldsFairImage}
    description={
      <div className="flex flex-col gap-2 mt-4 text-sm sm:text-base">
        <div>
          You're joining 15,000+ builders and users from around the world as we
          imagine the city of the future, built on Ethereum.
        </div>
        <div>
          <span className="font-semibold">
            Ethereum is ready for the real world
          </span>{' '}
          – we're excited to show you how.
        </div>
      </div>
    }
  />,
  <Slide
    key="step2"
    title="About The World's Fair"
    image={EthDayImage}
    description={
      <div className="text-sm sm:text-base">
        During Devconnect, La Rural will be transformed into the first Ethereum
        World's Fair:
        <div className="flex flex-col gap-2 mt-4 items-center">
          <Block
            icon={<MicrophoneIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
            description={
              <div>
                Join events featuring{' '}
                <span className="font-semibold">industry leaders</span> and
                builders working on Ethereum today
              </div>
            }
          />
          <Block
            icon={<PhoneIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
            description={
              <div>
                Discover cutting-edge,
                <span className="font-semibold">
                  {' '}
                  real-world Ethereum apps
                </span>{' '}
                at the App Showcase
              </div>
            }
          />
          <Block
            icon={<CupIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
            description={
              <div>
                Recharge and refuel at the many local{' '}
                <span className="font-semibold">
                  coffee and food merchants on-site
                </span>{' '}
                (all accepting crypto as payment)
              </div>
            }
          />
        </div>
      </div>
    }
  />,
  <Slide
    key="step3"
    title="Take part in Quests and earn real rewards!"
    image={CommunityEventsImage}
    description={
      <div className="text-sm sm:text-base">
        <div>
          We've created dedicated quest systems to help you explore the World's
          Fair, regardless of your experience level.
        </div>
        <div className="flex flex-col gap-2 mt-4 items-center">
          <Block
            icon={<RocketIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
            description={
              <div>
                Master the basics of Ethereum through our{' '}
                <span className="font-semibold">Onboarding</span> quests
              </div>
            }
          />
          <Block
            icon={<LuggageIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
            description={
              <div>
                Grab your collectible 'Stamp' from each booth at the{' '}
                <span className="font-semibold">App Showcase</span>
              </div>
            }
          />
        </div>
      </div>
    }
  />,
];

export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  steps = defaultSteps,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  // Prefetch images for subsequent slides
  // useEffect(() => {
  //   // Prefetch the remaining images when component mounts
  //   const imagesToPreload = [
  //     WorldsFairImage.src,
  //     EthDayImage.src,
  //     CommunityEventsImage.src,
  //   ];

  //   imagesToPreload.forEach((src) => {
  //     const link = document.createElement('link');
  //     link.rel = 'prefetch';
  //     link.as = 'image';
  //     link.href = src;
  //     document.head.appendChild(link);
  //   });
  // }, []);

  const stepItems = steps.map((_, index) => ({
    label: `Step ${index + 1}`,
    onClick: () => setCurrentStep(index),
  }));

  const nextStep = () => {
    const isLastStep = currentStep === steps.length - 1;

    if (isLastStep) {
      router.push('/');

      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const backStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="section min-h-screen gradient-background always-gradient overflow-y-auto flex flex-col">
      <div className="flex flex-col flex-1 items-center py-3 sm:py-8">
        <div className="flex flex-col justify-center items-center gap-2 shrink-0">
          <div className="text-lg font-semibold">
            {currentStep === 0 && 'Setup'}
            {currentStep === 1 && 'Welcome'}
            {currentStep === 2 && "World's Fair"}
            {currentStep === 3 && 'Quests & rewards'}
          </div>
          <DotsSelector
            items={stepItems}
            initialActiveIndex={currentStep}
            activeIndex={currentStep}
            onActiveIndexChange={setCurrentStep}
          />
        </div>
        <div
          className="flex flex-col items-center relative flex-1 w-[500px] max-w-[calc(100%-32px)] min-h-0"
          style={{ justifyContent: 'space-between' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5 }}
              className="w-full flex justify-center sm:items-center mt-8 sm:mt-16"
            >
              {steps[currentStep]}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-4 w-full justify-between items-center sm:px-16 mt-auto pb-2 sm:mt-16 !px-0 shrink-0">
            <Button
              className={cn(
                'font-semibold',
                currentStep === 0 && 'opacity-50 pointer-events-none'
              )}
              color="white-1"
              size="sm"
              onClick={backStep}
            >
              Back
            </Button>

            <Button
              color="blue-2"
              className="font-semibold"
              size="sm"
              onClick={nextStep}
            >
              {currentStep === steps.length - 1
                ? "Enter the World's Fair →"
                : 'Continue →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
