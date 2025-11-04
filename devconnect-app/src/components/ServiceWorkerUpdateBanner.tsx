'use client';

import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export function ServiceWorkerUpdateBanner() {
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const showUpdateToast = (waitingWorker: ServiceWorker) => {
      // Dismiss any existing update toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }

      toastIdRef.current = toast('New app version available!', {
        // description: 'Refresh to get the latest updates.',
        duration: Infinity,
        position: 'bottom-center',
        style: {
          paddingBottom: 'calc(16px + max(0px, env(safe-area-inset-bottom)))',
        },
        action: {
          label: 'Refresh Now',
          onClick: () => {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
          },
        },
        // cancel: {
        //   label: 'Later',
        //   onClick: () => {
        //     if (toastIdRef.current) {
        //       toast.dismiss(toastIdRef.current);
        //     }
        //   },
        // },
      });
    };

    // Check for waiting service worker on mount
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        showUpdateToast(registration.waiting);
      }

      // Listen for new service worker installing
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              showUpdateToast(newWorker);
            }
          });
        }
      });
    });

    // Listen for controller change (when SW takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  return null;
}
