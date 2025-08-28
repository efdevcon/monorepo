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

  // Prevent zooming on iOS (but allow map zooming)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Prevent zooming with pinch gestures (but not on map elements)
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          // Check if the target is within a map element
          const target = e.target as Element;
          const isMapElement = target.closest('[data-map="true"], .map-container, .leaflet-container, .mapboxgl-canvas-container, [role="application"]');
          
          if (!isMapElement) {
            e.preventDefault();
          }
        }
      };

      // Prevent zooming with double tap (but not on map elements)
      let lastTouchEnd = 0;
      const preventDoubleTapZoom = (e: TouchEvent) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          // Check if the target is within a map element
          const target = e.target as Element;
          const isMapElement = target.closest('[data-map="true"], .map-container, .leaflet-container, .mapboxgl-canvas-container, [role="application"]');
          
          if (!isMapElement) {
            e.preventDefault();
          }
        }
        lastTouchEnd = now;
      };

      // Add event listeners
      document.addEventListener('touchstart', preventZoom, { passive: false });
      document.addEventListener('touchend', preventDoubleTapZoom, {
        passive: false,
      });

      // Set viewport meta tag programmatically as backup
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no'
        );
      }

      return () => {
        document.removeEventListener('touchstart', preventZoom);
        document.removeEventListener('touchend', preventDoubleTapZoom);
      };
    }
  }, []);

  return (
    <>
      {children}
      <InstallPWA />
    </>
  );
};

export default PWAProvider 
