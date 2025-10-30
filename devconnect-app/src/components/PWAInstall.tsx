'use client';

import React, { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CloseIcon from '@/components/icons/CloseIcon';
import Image from 'next/image';

interface InstallPWAProps {
  onClose?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA: React.FC<InstallPWAProps> = ({ onClose }) => {
  const pathname = usePathname();
  const [showPopup, setShowPopup] = useState(false);
  const [showInstallPWA, setShowInstallPWA] = useLocalStorage(
    'showInstallPWA',
    false
  );
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);
  const [lastShownTimestamp, setLastShownTimestamp] = useLocalStorage<
    number | null
  >('pwaPopupLastShown', null);
  const [shownCount, setShownCount] = useLocalStorage<number>(
    'pwaPopupShownCount',
    0
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Never show on /pos route
    if (pathname === '/pos') {
      return;
    }
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Check if 24 hours have passed since last shown
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const has24HoursPassed =
      !lastShownTimestamp || now - lastShownTimestamp >= oneDayInMs;

    // Reset counter if 24 hours have passed
    if (has24HoursPassed && shownCount >= 2) {
      setShownCount(0);
      setLastShownTimestamp(null);
    }

    // Show popup if:
    // 1. PWA not already installed (pwa is false)
    // 2. showInstallPWA is true
    // 3. Shown less than 2 times (only the first time) OR 24 hours have passed since it was last hidden
    const canShow = shownCount < 2 || has24HoursPassed;

    // Display if pwa is explicitly false (not installed)
    if (pwa === false && showInstallPWA === true && canShow) {
      setShowPopup(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, [
    pathname,
    pwa,
    showInstallPWA,
    lastShownTimestamp,
    shownCount,
    setLastShownTimestamp,
    setShownCount,
  ]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          handleCloseClick();
        }
      });
    }
  };

  const handleCloseClick = () => {
    setShowPopup(false);
    setShowInstallPWA(false);

    // Increment the shown count
    const newCount = shownCount + 1;
    setShownCount(newCount);

    // If we've shown it 2 times, start the 24-hour cooldown
    if (newCount >= 2) {
      setLastShownTimestamp(Date.now());
    }

    if (onClose) {
      onClose();
    }
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-[1000000000000000000] flex items-end justify-center bg-black/64 md:items-center overflow-y-auto">
      {/* Modal Content */}
      <div className="relative w-full max-w-[393px] md:max-w-[474px] my-auto">
        {/* Hero Section */}
        <div className="relative w-full">
          <div
            className="relative w-full aspect-[393/396] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/app-install.jpg')" }}
          >
            {/* Header */}
            <div className="absolute top-5 right-6 flex items-start justify-between">
              <button
                onClick={handleCloseClick}
                className="relative w-8 h-8 bg-white cursor-pointer hover:opacity-80 transition-opacity"
              >
                <CloseIcon size="md" color="#36364C" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div
          className="px-6 pt-6 pb-12 relative flex flex-col"
          style={{
            backgroundImage:
              'radial-gradient(circle at center bottom, rgba(222,235,248,1) 0%, rgba(247,250,253,1) 100%)',
          }}
        >
          {/* Text Content */}
          <div className="mb-6 space-y-3 flex-1">
            <p className="text-[#36364c] text-[20px] leading-[1.3] font-bold tracking-[-0.25px]">
              Devconnect App is a PWA <br />
              (Progressive Web Application)
            </p>
            <p className="text-[#36364c] text-[20px] leading-[1.3] tracking-[-0.25px]">
              For the best experience, install the app on your smartphone.
            </p>
          </div>

          {/* Instruction Container */}
          <div className="bg-[#1b6fae] border-2 border-[#3898e0] rounded-sm p-3 flex items-center gap-3">
            {/* Icon Container */}
            <div className="bg-[#deebf8] rounded-sm w-12 h-12 flex items-center justify-center flex-shrink-0">
              {isIOS ? (
                <Image
                  src="/images/add-ios.svg"
                  alt="iOS Add to Home Screen"
                  width={24}
                  height={24}
                />
              ) : (
                <Image
                  src="/images/add-android.svg"
                  alt="Android Add to Home Screen"
                  width={24}
                  height={24}
                />
              )}
            </div>

            {/* Instructions */}
            <div className="text-white text-[13px] leading-[17px] flex-1">
              {isIOS ? (
                <p>
                  On iOS, open this website{' '}
                  <span className="font-bold">in Safari</span> and tap{' '}
                  <span className="font-bold">Share</span>, then{' '}
                  <span className="font-bold">Add to Home Screen</span>.
                </p>
              ) : (
                <p>
                  On <span className="font-bold">Android</span>, tap{' '}
                  <span className="font-bold">More</span>,{' '}
                  <span className="font-bold">Add to Home Screen</span> then{' '}
                  <span className="font-bold">Install</span>.
                </p>
              )}
            </div>
          </div>

          {/* Native Install Button (if available) */}
          {deferredPrompt && (
            <div className="mt-4">
              <Button
                onClick={handleInstallClick}
                className="w-full bg-[#1b6fae] hover:bg-[#145280] text-white font-bold py-4 px-6 rounded-sm shadow-[0px_6px_0px_0px_#125181]"
              >
                Install App
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
