'use client';

import React, { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CloseIcon from '@/components/icons/CloseIcon';
import Image from 'next/image';
import Icon from '@mdi/react';
import { mdiExportVariant } from '@mdi/js';
import appInstallImage from '@/images/app-install.jpg';

interface InstallPWAProps {
  onClose?: () => void;
  forceMobile?: boolean; // Allow manual override for testing
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA: React.FC<InstallPWAProps> = ({ onClose, forceMobile }) => {
  const pathname = usePathname();
  const [showPopup, setShowPopup] = useState(false);
  const [showInstallPWA, setShowInstallPWA] = useLocalStorage(
    'showInstallPWA',
    false
  );
  const [forceShowInstallPWA, setForceShowInstallPWA] = useLocalStorage(
    'forceShowInstallPWA',
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
  const [isMobile, setIsMobile] = useState(true);

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

    // Detect device type: mobile (< 768px), tablet/desktop (>= 768px)
    const checkIsMobile = () => {
      setIsMobile(
        forceMobile !== undefined ? forceMobile : window.innerWidth < 768
      );
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    // Check if 24 hours have passed since last shown (only for tablet/desktop)
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const has24HoursPassed =
      !lastShownTimestamp || now - lastShownTimestamp >= oneDayInMs;

    // Reset counter if 24 hours have passed
    if (has24HoursPassed && shownCount >= 2) {
      setShownCount(0);
      setLastShownTimestamp(null);
    }

    // Show popup logic:
    // - Mobile: ONLY show when forceShowInstallPWA is true (user clicked button) - NO automatic display
    // - Tablet/Desktop: Auto-show max once per 24h, OR when forceShowInstallPWA is true (manual trigger)

    let shouldDisplay = false;

    if (pwa === false) {
      if (forceShowInstallPWA === true) {
        // Manual trigger: Always show (both mobile and desktop)
        shouldDisplay = true;
      } else if (!isMobile && showInstallPWA === true) {
        // Desktop/Tablet automatic display: Only if 24h has passed
        const canShowDesktop = shownCount < 1 || has24HoursPassed;
        shouldDisplay = canShowDesktop;
      }
      // Note: Mobile automatic display is intentionally excluded
    }

    if (shouldDisplay) {
      setShowPopup(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [
    pathname,
    pwa,
    showInstallPWA,
    forceShowInstallPWA,
    lastShownTimestamp,
    shownCount,
    setLastShownTimestamp,
    setShownCount,
    isMobile,
    forceMobile,
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
    setForceShowInstallPWA(false);
    setShowPopup(false);
    setShowInstallPWA(false);

    // For tablet/desktop only: track timestamp for once-per-day limit
    if (!isMobile) {
      setLastShownTimestamp(Date.now());
      setShownCount(1);
    }

    if (onClose) {
      onClose();
    }
  };

  // Handle Escape key press to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseClick();
      }
    };

    if (showPopup || forceShowInstallPWA) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showPopup, forceShowInstallPWA]);

  if (!showPopup && !forceShowInstallPWA) return null;

  // Render mobile version (instruction modal)
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-[1000000000000000000] flex items-end justify-center bg-black/64 overflow-y-auto"
        onClick={handleCloseClick}
      >
        {/* Modal Content */}
        <div
          className="relative w-full max-w-[393px] my-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero Section */}
          <div className="relative w-full h-[396px] block bg-[#deebf8]">
            <Image
              src={appInstallImage}
              alt="Hero"
              fill
              className="object-cover block"
            />
            {/* Header */}
            <div className="absolute top-5 left-6 right-6 flex items-end justify-end">
              <button
                onClick={handleCloseClick}
                className="relative w-8 h-8 bg-white cursor-pointer hover:opacity-80 transition-opacity rounded-sm flex items-center justify-center"
              >
                <CloseIcon size="md" color="#36364C" />
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div
            className="px-6 pt-6 pb-12 relative flex flex-col gap-6 -mt-[1px]"
            style={{
              backgroundImage:
                'radial-gradient(76.59% 100% at 50% 100%, #F7FAFD 0%, #DEEBF8 100%)',
            }}
          >
            {/* Text Content */}
            <div className="flex flex-col gap-3">
              <p className="text-[#36364c] text-[20px] leading-[1.3] font-bold tracking-[-0.25px]">
                Devconnect App is a PWA <br />
                (Progressive Web Application)
              </p>
              <p className="text-[#36364c] text-[20px] leading-[1.3] tracking-[-0.25px]">
                For the best experience, install the app on your smartphone.
              </p>
            </div>

            {/* Instruction Container */}
            <div className="bg-white border border-[#ededf0] rounded-[2px] p-3 flex items-center gap-3">
              {/* Icon Container */}
              <div className="bg-[#eaf4fb] rounded-sm w-12 h-12 flex items-center justify-center flex-shrink-0">
                <Icon path={mdiExportVariant} size={1} color="#0073DE" />
              </div>

              {/* Instructions */}
              <div className="text-[#353548] text-[13px] leading-[17px] flex-1">
                {isIOS ? (
                  <p>
                    On iOS <span className="font-normal">(Safari)</span>, open
                    the browser menu and tap{' '}
                    <span className="font-bold">Share</span> then{' '}
                    <span className="font-bold">Add to Home Screen</span>.
                  </p>
                ) : (
                  <p>
                    On Android, tap <span className="font-bold">More</span>,{' '}
                    <span className="font-bold">Add to Home Screen</span> then{' '}
                    <span className="font-bold">Install.</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render tablet/desktop version (max once per day)
  return (
    <div
      className="fixed inset-0 z-[1000000000000000000] flex items-center justify-center bg-black/64 overflow-y-auto"
      onClick={handleCloseClick}
    >
      {/* Modal Content */}
      <div
        className="relative w-full max-w-[428px] my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Section */}
        <div className="relative w-full h-[431px] block bg-[#deebf8]">
          <Image
            src={appInstallImage}
            alt="Hero"
            fill
            className="object-cover block"
          />
          {/* Header */}
          <div className="absolute top-5 left-6 right-6 flex items-end justify-end">
            <button
              onClick={handleCloseClick}
              className="relative w-8 h-8 bg-white cursor-pointer hover:opacity-80 transition-opacity rounded-sm flex items-center justify-center"
            >
              <CloseIcon size="md" color="#36364C" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div
          className="px-6 pt-6 pb-6 relative flex flex-col gap-6"
          style={{
            backgroundImage:
              'radial-gradient(circle at center bottom, rgba(222,235,248,1) 0%, rgba(247,250,253,1) 100%)',
          }}
        >
          {/* Text Content */}
          <div className="flex flex-col gap-3">
            <p className="text-[#36364c] text-[20px] leading-[1.3] font-bold tracking-[-0.25px]">
              World's Fair App is a PWA (Progressive Web Application)
            </p>
            <p className="text-[#36364c] text-[20px] leading-[1.3] tracking-[-0.25px]">
              For the best experience, install the app on your smartphone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
