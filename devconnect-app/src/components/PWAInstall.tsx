'use client'

import React, { useEffect, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { Button } from '@/components/ui/button'
import CloseIcon from '@/components/icons/CloseIcon';

interface InstallPWAProps {
  onClose?: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const InstallPWA: React.FC<InstallPWAProps> = ({ onClose }) => {
  const [showPopup, setShowPopup] = useState(false)
  const [showInstallPWA, setShowInstallPWA] = useLocalStorage('showInstallPWA', false)
  const [pwa] = useLocalStorage<boolean | null>('pwa', null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Only show PWA prompt if not already installed and showInstallPWA is true
    if (pwa === false && showInstallPWA === true) {
      setShowPopup(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, [pwa, showInstallPWA]);

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
    if (onClose) {
      onClose();
    }
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/64 md:items-center">
      {/* Modal Content */}
      <div className="relative w-full max-w-[474px]">
        {/* Hero Section */}
        <div
          className="relative h-[396px] bg-cover bg-center bg-no-repeat mb-0"
          style={{ backgroundImage: "url('/images/app-install.jpg')" }}
        >
          {/* Header */}
          <div className="absolute top-5 left-6 right-6 flex items-start justify-between">
            <button
              onClick={handleCloseClick}
              className="relative w-8 h-8 text-white hover:opacity-80 transition-opacity ml-auto"
            >
              <CloseIcon size="md" color="#ffffff" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-gradient-to-b from-[#f7fafd] to-[#deebf8] px-6 pt-6 pb-10 relative min-h-[300px] flex flex-col">
          {/* Text Content */}
          <div className="mb-6 space-y-3 flex-1">
            <p className="text-[#36364c] text-xl leading-[1.2] font-bold">
              World Fair App is a PWA (Progressive Web Application).
            </p>
            <p className="text-[#36364c] text-xl leading-[1.2]">
              For the best experience, add the app to your home screen.
            </p>
          </div>

          {/* Instruction Container */}
          <div className="bg-[#1b6fae] rounded shadow-[0px_4px_0px_0px_#145280] p-3 flex items-end gap-3 md:items-center md:mx-auto md:max-w-md">
            {/* Icon Container */}
            <div className="bg-[#deebf8] rounded w-12 h-12 flex items-center justify-center flex-shrink-0">
              {isIOS ? (
                // Share icon for iOS
                <svg
                  className="w-6 h-6 text-[#1b6fae]"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08273 9.26756C7.54303 8.48822 6.61644 8 5.5 8C4.11929 8 3 9.11929 3 10.5C3 11.8807 4.11929 13 5.5 13C6.61644 13 7.54303 12.5118 8.08273 11.7324L15.0227 15.6294C15.0077 15.7508 15 15.8745 15 16C15 17.6569 16.3431 19 18 19C19.6569 19 21 17.6569 21 16C21 14.3431 19.6569 13 18 13C16.3431 13 15 14.3431 15 16C15 16.1255 15.0077 16.2492 15.0227 16.3706L8.08273 12.4736C7.54303 13.2529 6.61644 13.7412 5.5 13.7412C4.11929 13.7412 3 12.6219 3 11.2412C3 9.86047 4.11929 8.74118 5.5 8.74118C6.61644 8.74118 7.54303 9.22942 8.08273 10.0088L15.0227 6.1118C15.0077 5.99036 15 5.86667 15 5.74118C15 4.08433 16.3431 2.74118 18 2.74118C19.6569 2.74118 21 4.08433 21 5.74118C21 7.39803 19.6569 8.74118 18 8.74118Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                // Menu icon for Android
                <svg
                  className="w-6 h-6 text-[#1b6fae] rotate-90"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M3 6H21M3 12H21M3 18H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {/* Instructions */}
            <div className="text-white text-sm leading-[17px] flex-1">
              {isIOS ? (
                <p>
                  On <span className="font-bold">iOS (Safari)</span>, open the
                  browser menu and tap <span className="font-bold">Share</span>{' '}
                  then <span className="font-bold">Add to Home Screen</span>.
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
            <div className="mt-4 md:mx-auto md:max-w-md">
              <Button
                onClick={handleInstallClick}
                className="w-full bg-[#1b6fae] hover:bg-[#145280] text-white font-bold py-4 px-6 rounded shadow-[0px_6px_0px_0px_#125181]"
              >
                Install App
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstallPWA 
