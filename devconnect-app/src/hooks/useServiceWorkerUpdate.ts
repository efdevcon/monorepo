'use client';

import { useState, useEffect } from 'react';
import { isUpdateAvailable, triggerUpdate } from '@/components/ServiceWorkerUpdateBanner';

/**
 * Hook to check if a service worker update is available and trigger it
 * Useful for showing update buttons in Settings or other UI components
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check immediately
    setUpdateAvailable(isUpdateAvailable());

    // Check periodically in case user navigates to Settings after dismissing
    const interval = setInterval(() => {
      setUpdateAvailable(isUpdateAvailable());
    }, 1000);

    // Listen for custom events that might indicate update state changed
    const handleUpdateStateChange = () => {
      setUpdateAvailable(isUpdateAvailable());
    };

    window.addEventListener('sw-update-available', handleUpdateStateChange);
    window.addEventListener('sw-update-dismissed', handleUpdateStateChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sw-update-available', handleUpdateStateChange);
      window.removeEventListener('sw-update-dismissed', handleUpdateStateChange);
    };
  }, []);

  return {
    updateAvailable,
    triggerUpdate,
  };
}

