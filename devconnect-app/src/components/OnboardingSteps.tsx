import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import ChevronRightIcon from 'assets/icons/chevron_right.svg'
import { ChevronRightIcon } from 'lucide-react';
import { DotsSelector } from 'lib/components/dots-selector';
import { Button } from './ui/button';
import FirstSlideImage from '@/images/voxel-1.jpg';
import SecondSlideImage from '@/images/voxel-2.jpg';
import ThirdSlideImage from '@/images/voxel-car.jpg';
import Image from 'next/image';

interface OnboardingStepsProps {
  steps?: React.ReactNode[];
  rightContent?: React.ReactNode[];
}

const Slide = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="flex flex-col">
      <div className="aspect-[480/194] relative w-full">
        <Image
          src={FirstSlideImage}
          alt="voxel art"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <div className="text-lg font-semibold">{title}</div>
        {description}
      </div>
    </div>
  );
};

const defaultSteps = [
  <Slide
    key="step1"
    title="Welcome to Devconnect ARG: the first Ethereum World's Fair"
    description="You're joining 15,000+ builders, developers and users from around the world as we imagine the city of the future, built on Ethereum. Ethereum is ready for the real world - we're excited to show you how."
  />,
  <Slide
    key="step2"
    title="About The World’s Fair"
    description="During Devconnect, La Rural will be transformed into the first Ethereum World’s Fair:"
  />,
  <Slide
    key="step3"
    title="Take part in Quests and earn real rewards!"
    description="We’ve created dedicated quest systems to help you explore the World's Fair, regardless of your experience level."
  />,
];

export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  steps = defaultSteps,
  rightContent,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const stepItems = steps.map((_, index) => ({
    label: `Step ${index + 1}`,
    onClick: () => setCurrentStep(index),
  }));

  const nextStep = () => {
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
    <div className="flex flex-col h-full justify-center items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-lg font-semibold">
          {currentStep === 0 && 'Welcome'}
          {currentStep === 1 && 'Worlds Fair'}
          {currentStep === 2 && 'Quests & Rewards'}
        </div>
        <DotsSelector
          items={stepItems}
          initialActiveIndex={currentStep}
          activeIndex={currentStep}
          onActiveIndexChange={setCurrentStep}
        />
      </div>
      <div className="flex flex-col justify-center items-center relative max-w-[580px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex justify-center items-center mt-16"
          >
            {steps[currentStep]}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4 justify-between items-center mt-16">
          <Button className="bottom-0 left-0 right-0" onClick={backStep}>
            Back
          </Button>

          <Button className="bottom-0 left-0 right-0" onClick={nextStep}>
            Continue
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        {/* <div
          className="rounded-full bg-[#EFEBFF] text-[#7D52F4] flex items-center justify-center text-xs p-3 gap-2 cursor-pointer hover:scale-110 transition-all duration-500 border border-[#7D52F4] select-none"
          onClick={nextStep}
        >
          <ChevronRightIcon
            className="text-xs"
            // @ts-ignore
            style={{ '--color-icon': '#7D52F4', fontSize: '12px' }}
          />
        </div> */}
      </div>
    </div>
  );
};
