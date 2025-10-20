import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import ChevronRightIcon from 'assets/icons/chevron_right.svg'
import { ChevronRightIcon } from 'lucide-react';
import { DotsSelector } from 'lib/components/dots-selector';

interface OnboardingStepsProps {
  steps?: React.ReactNode[];
  rightContent?: React.ReactNode[];
}

const defaultSteps = [
  <div key="step1">Hello from first slide</div>,
  <div key="step2">Hello from second slide</div>,
  <div key="step3">Hello from third slide</div>,
  <div key="step4">Hello from fourth slide</div>,
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            {steps[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center mt-4">
        <DotsSelector
          items={stepItems}
          initialActiveIndex={currentStep}
          activeIndex={currentStep}
          onActiveIndexChange={setCurrentStep}
        />

        <div
          className="rounded-full bg-[#EFEBFF] text-[#7D52F4] flex items-center justify-center text-xs p-3 gap-2 cursor-pointer hover:scale-110 transition-all duration-500 border border-[#7D52F4] select-none"
          onClick={nextStep}
        >
          <ChevronRightIcon
            className="text-xs"
            style={{ '--color-icon': '#7D52F4', fontSize: '12px' }}
          />
        </div>
      </div>
    </div>
  );
};
