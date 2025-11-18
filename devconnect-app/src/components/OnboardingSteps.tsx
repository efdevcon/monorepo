'use client';
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
import { useTranslations } from 'next-intl';
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
      <div className="mt-3 sm:mt-5 leading-tight">
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

const useDefaultSteps = () => {
  const t = useTranslations('onboardingSteps');

  return [
    <div key="step0" className="flex flex-col items-center text-center">
      <div className="aspect-[480/480] relative w-full mb-3 sm:mb-6">
        <Lottie
          animationData={WalletConnectedAnimation}
          loop={false}
          className="w-full h-full object-contain mix-blend-multiply max-w-[240px] sm:max-w-[300px]"
        />
      </div>
      <div className="leading-tight">
        <div className="text-xl font-semibold leading-tight mb-2">
          {t('walletConnected')}
        </div>
        <div className="text-sm sm:text-base">
          {t('finalSteps')}
        </div>
      </div>
    </div>,
    <Slide
      key="step1"
      title={t('welcomeTitle')}
      image={WorldsFairImage}
      description={
        <div className="flex flex-col gap-2 mt-2 sm:mt-4 text-sm sm:text-base">
          <div>
            {t('welcomeDescription1')}
          </div>
          <div>
            <span className="font-semibold">
              {t('welcomeDescription2Bold')}
            </span>{' '}
            {t('welcomeDescription2')}
          </div>
        </div>
      }
    />,
    <Slide
      key="step2"
      title={t('aboutTitle')}
      image={EthDayImage}
      description={
        <div className="text-sm sm:text-base">
          {t('aboutDescription')}
          <div className="flex flex-col gap-2 mt-2 sm:mt-4 items-center">
            <Block
              icon={<MicrophoneIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
              description={
                t.rich('aboutBlock1', {
                  bold: (chunks) => <span className="font-semibold">{chunks}</span>
                })
              }
            />
            <Block
              icon={<PhoneIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
              description={
                t.rich('aboutBlock2', {
                  bold: (chunks) => <span className="font-semibold">{chunks}</span>
                })
              }
            />
            <Block
              icon={<CupIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
              description={
                t.rich('aboutBlock3', {
                  bold: (chunks) => <span className="font-semibold">{chunks}</span>
                })
              }
            />
          </div>
        </div>
      }
    />,
    <Slide
      key="step3"
      title={t('questsTitle')}
      image={CommunityEventsImage}
      description={
        <div className="text-sm sm:text-base">
          <div>
            {t('questsDescription')}
          </div>
          <div className="flex flex-col gap-2 mt-2 sm:mt-4 items-center">
            <Block
              icon={<RocketIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
              description={
                t.rich('questsBlock1', {
                  bold: (chunks) => <span className="font-semibold">{chunks}</span>
                })
              }
            />
            <Block
              icon={<LuggageIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
              description={
                t.rich('questsBlock2', {
                  bold: (chunks) => <span className="font-semibold">{chunks}</span>
                })
              }
            />
          </div>
        </div>
      }
    />,
  ];
};

export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  steps: customSteps,
}) => {
  const t = useTranslations('onboardingSteps');
  const defaultSteps = useDefaultSteps();
  const steps = customSteps || defaultSteps;
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
    <div
      className="section gradient-background always-gradient flex flex-col h-screen relative overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col flex-1 items-center py-3 sm:py-8">
        <div className="flex flex-col justify-center items-center gap-2 shrink-0">
          <div className="text-lg font-semibold">
            {currentStep === 0 && t('setup')}
            {currentStep === 1 && t('welcome')}
            {currentStep === 2 && t('worldsFair')}
            {currentStep === 3 && t('questsRewards')}
          </div>
          <DotsSelector
            items={stepItems}
            initialActiveIndex={currentStep}
            activeIndex={currentStep}
            onActiveIndexChange={setCurrentStep}
          />
        </div>
        <div className="flex flex-col items-center relative flex-1 w-[500px] max-w-[calc(100%-32px)] min-h-0 mt-4 sm:mt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center"
            >
              {steps[currentStep]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed navigation at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 sm:px-16 py-4 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm"
        style={{
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex gap-4 w-full justify-between items-center max-w-[500px] mx-auto">
          <Button
            className={cn(
              'font-semibold shrink-0',
              currentStep === 0 && 'opacity-50 pointer-events-none'
            )}
            color="white-1"
            size="sm"
            onClick={backStep}
          >
            {t('back')}
          </Button>

          <Button
            color="blue-2"
            className="font-semibold grow sm:grow-0"
            size="sm"
            onClick={nextStep}
          >
            {currentStep === steps.length - 1
              ? t('enterWorldsFair')
              : t('continue')}
          </Button>
        </div>
      </div>
    </div>
  );
};
