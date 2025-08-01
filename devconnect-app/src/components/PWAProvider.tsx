'use client'

import React, { useEffect } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import InstallPWA from './PWAInstall'

interface PWAProviderProps {
  children: React.ReactNode
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

const PWAProvider = ({ children }: PWAProviderProps) => {
  const [pwa, setPwa] = useLocalStorage<boolean | null>('pwa', null);
  const [, setShowInstallPWA] = useLocalStorage('showInstallPWA', false);

  useEffect(() => {
    if (
      (typeof window !== 'undefined' &&
        window.location.search.includes('pwa=true')) ||
      pwa === true
    ) {
      setPwa(true);
    } else if (typeof window !== 'undefined') {
      // Check if we're in standalone mode (already installed as PWA)
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      const isIOSStandalone =
        'standalone' in window.navigator &&
        (window.navigator as NavigatorStandalone).standalone === true;

      // If already in PWA mode, set pwa to true
      if (isStandalone || isIOSStandalone) {
        setPwa(true);
        setShowInstallPWA(false);
      } else {
        setPwa(false);
        setShowInstallPWA(true);
      }
    }
  }, [setPwa, setShowInstallPWA, pwa]);

  return (
    <>
      {children}
      <InstallPWA />
    </>
  );
};

export default PWAProvider 
