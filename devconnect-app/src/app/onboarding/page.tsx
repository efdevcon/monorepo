'use client';

import Onboarding from '@/components/Onboarding';
import fullWidthBackground from '@/images/pwa-onboarding-hero-img.jpg';
import Image from 'next/image';
import { useOnboardingLoading } from '@/components/Onboarding';
import Lottie from 'lottie-react';
import LoadingAnimation from '@/images/loading-animation.json';

export default function OnboardingPage() {
  const { isInitialLoading, shouldSkipWalletAnimation } =
    useOnboardingLoading();
  const showLoadingOverlay = isInitialLoading || shouldSkipWalletAnimation;

  return (
    <div
      className="flex items-start justify-center px-4 grow overflow-y"
      style={{
        backgroundImage: `url(${fullWidthBackground.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        height: '100vh',
        minHeight: 'fit-content',
      }}
    >
      {/* <Image
        src={fullWidthBackground}
        alt="Midj Epic City 3"
        className="absolute inset-0 w-full h-full object-cover"
        fill
        placeholder="blur"
      /> */}

      <div
        className="max-w-md w-full h-full"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Onboarding />
      </div>

      {/* Loading overlay at page level - not affected by parent containers */}
      {showLoadingOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#F7FBFD',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lottie
            animationData={LoadingAnimation}
            loop={true}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}
