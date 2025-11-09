'use client';

import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { mutate } from 'swr';
import { hardReload } from '@/utils/reload';

// Store the waiting worker reference globally so it can be accessed from Settings
let globalWaitingWorker: ServiceWorker | null = null;

// Helper to check if update is available
export function isUpdateAvailable(): boolean {
  return globalWaitingWorker !== null;
}

// Helper to trigger update from anywhere (e.g., Settings)
export function triggerUpdate(): void {
  if (globalWaitingWorker) {
    // Dispatch custom event to trigger update
    window.dispatchEvent(new CustomEvent('sw-update-trigger'));
  }
}

// DEBUG: Simulate an incoming service worker update for testing
export function simulateUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker not supported');
    return;
  }

  console.log('🔧 [DEBUG] Simulating service worker update...');

  // Create a mock waiting worker
  const mockWorker = {
    postMessage: (msg: any) => {
      console.log('🔧 [DEBUG] Mock worker received message:', msg);
      if (msg.type === 'SKIP_WAITING') {
        console.log('🔧 [DEBUG] Simulating update process...');
        // Trigger the controllerchange event to simulate update
        setTimeout(() => {
          window.dispatchEvent(new Event('sw-controllerchange-debug'));
        }, 100);
      }
    },
    state: 'installed',
  } as any;

  // Set global worker and trigger update toast
  globalWaitingWorker = mockWorker;
  window.dispatchEvent(new CustomEvent('sw-update-available'));

  console.log('✅ [DEBUG] Mock update notification triggered');
}

export function ServiceWorkerUpdateBanner() {
  const toastIdRef = useRef<string | number | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Recommendation 8: Show changelog notification after successful update
    const checkForRecentUpdate = () => {
      if (sessionStorage.getItem('justUpdated') === 'true') {
        sessionStorage.removeItem('justUpdated');

        // SWR Compatibility: Clear all SWR caches after app update
        // This prevents serving stale data with potentially incompatible formats
        console.log('🔄 [SW Update] Clearing SWR cache after app update');
        mutate(
          () => true, // Match all keys
          undefined, // Clear data
          { revalidate: true } // Trigger immediate revalidation
        );

        // Restore scroll position if available
        const savedScrollPosition = sessionStorage.getItem('scrollPosition');
        const savedScrollPath = sessionStorage.getItem('scrollPath');

        if (
          savedScrollPosition &&
          savedScrollPath === window.location.pathname
        ) {
          // Restore scroll position after page loads
          const scrollY = parseInt(savedScrollPosition, 10);

          // Try immediate restoration
          window.scrollTo(0, scrollY);

          // Also try after a short delay in case content is still loading
          setTimeout(() => {
            window.scrollTo(0, scrollY);
          }, 100);

          // Clean up
          sessionStorage.removeItem('scrollPosition');
          sessionStorage.removeItem('scrollPath');
        }

        // Small delay to ensure page is fully loaded
        setTimeout(() => {
          toast.success('App updated successfully! 🎉', {
            description:
              "You're now using the latest version with new improvements.",
            duration: 5000,
            dismissible: true,
            closeButton: true,
            style: {
              marginBottom: 'calc(4px + max(0px, env(safe-area-inset-bottom)))',
              zIndex: 9999999999999999999,
            },
          });
        }, 1000);
      }
    };

    checkForRecentUpdate();

    const performUpdate = (worker: ServiceWorker) => {
      // Prevent multiple clicks
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;

      // Dismiss existing toast and show loading state
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toastIdRef.current = toast.loading('Updating app...', {
        description: 'This will only take a moment.',
        duration: Infinity,
        dismissible: true,
        closeButton: true,
        style: {
          marginBottom: 'calc(4px + max(0px, env(safe-area-inset-bottom)))',
          zIndex: 9999999999999999999,
        },
      });

      // Tell the waiting service worker to activate
      worker.postMessage({ type: 'SKIP_WAITING' });
    };

    const showUpdateToast = (
      waitingWorker: ServiceWorker,
      skipEvent = false
    ) => {
      // Store worker reference globally
      globalWaitingWorker = waitingWorker;

      // Dispatch event so other components (like Settings) know update is available
      // Skip if this is triggered BY the event (prevent loop)
      if (!skipEvent) {
        window.dispatchEvent(new CustomEvent('sw-update-available'));
      }

      // Dismiss any existing update toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }

      toastIdRef.current = toast('New app version available!', {
        description: 'Refresh to get the latest updates.',
        duration: Infinity,
        dismissible: true, // Allow swipe/click to dismiss
        closeButton: true, // Show X button
        style: {
          marginBottom: 'calc(4px + max(0px, env(safe-area-inset-bottom)))',
          zIndex: 9999999999999999999,
        },
        action: {
          label: 'Update Now',
          onClick: () => performUpdate(waitingWorker),
        },
        cancel: {
          label: 'Later',
          onClick: () => {
            if (toastIdRef.current) {
              toast.dismiss(toastIdRef.current);
            }
            // Worker reference stays in globalWaitingWorker for Settings page
            // Dispatch event so Settings knows update was dismissed
            window.dispatchEvent(new CustomEvent('sw-update-dismissed'));

            toast.success('Update postponed', {
              description: 'You can update from Settings later.',
              duration: 4000,
              dismissible: true,
              closeButton: true,
              style: {
                marginBottom:
                  'calc(4px + max(0px, env(safe-area-inset-bottom)))',
                zIndex: 9999999999999999999,
              },
            });
          },
        },
      });
    };

    // Listen for custom update trigger event from Settings
    const handleUpdateTrigger = () => {
      if (globalWaitingWorker) {
        performUpdate(globalWaitingWorker);
      }
    };

    // DEBUG: Listen for simulated update available event
    const handleSimulatedUpdateAvailable = () => {
      if (globalWaitingWorker) {
        console.log('🔧 [DEBUG] Showing update toast for simulated worker');
        showUpdateToast(globalWaitingWorker, true); // skipEvent = true to prevent loop
      }
    };

    // Recommendation 3: Listen for slow network notifications from service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SLOW_NETWORK') {
        toast.info('Slow connection', {
          description: event.data.message,
          duration: 3000,
          dismissible: true,
          closeButton: true,
          style: {
            marginBottom: 'calc(4px + max(0px, env(safe-area-inset-bottom)))',
            zIndex: 9999999999999999999,
          },
        });
      }
    };

    window.addEventListener('sw-update-trigger', handleUpdateTrigger);
    window.addEventListener(
      'sw-update-available',
      handleSimulatedUpdateAvailable
    );

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener(
        'message',
        handleServiceWorkerMessage
      );
    }

    // Check for waiting service worker IMMEDIATELY (fastest possible check)
    const checkForWaitingWorker = async () => {
      try {
        // Use getRegistration() instead of .ready for faster response
        // This returns immediately if SW is already registered
        const registration = await navigator.serviceWorker.getRegistration();

        if (registration) {
          // Immediately check if there's a waiting worker
          if (registration.waiting) {
            console.log('🔄 [SW Update] Waiting worker found immediately');
            showUpdateToast(registration.waiting);
          }

          // Listen for new service worker installing
          registration.addEventListener('updatefound', () => {
            console.log('🔄 [SW Update] Update found event triggered');
            const newWorker = registration.installing;
            if (newWorker) {
              // Show toast IMMEDIATELY when update starts downloading
              // Don't wait for 'installed' state - that can take 20+ seconds
              console.log('🔄 [SW Update] Showing update notification immediately');
              
              // Show a different toast while downloading
              if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
              }
              
              toastIdRef.current = toast.loading('Downloading update...', {
                description: 'A new version is being prepared.',
                duration: Infinity,
                closeButton: true,
                style: {
                  marginBottom: 'calc(4px + max(0px, env(safe-area-inset-bottom)))',
                  zIndex: 9999999999999999999,
                },
              });
              
              newWorker.addEventListener('statechange', () => {
                console.log(
                  '🔄 [SW Update] New worker state:',
                  newWorker.state
                );
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  console.log(
                    '🔄 [SW Update] New worker installed, showing update prompt'
                  );
                  // Now show the actual update prompt
                  showUpdateToast(newWorker);
                }
              });
            }
          });
        }
      } catch (err) {
        console.error('Failed to check for waiting worker:', err);
      }
    };

    // Run immediately - getRegistration() is much faster than .ready
    checkForWaitingWorker();

    // Check for updates when user returns to the app (e.g., switching tabs)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          // Get registration immediately without waiting
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Check for updates in the background
            await registration.update();
          }
        } catch (err) {
          console.warn('Service worker update check failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for controller change (when SW takes control)
    const handleControllerChange = () => {
      // Clear the global worker reference
      globalWaitingWorker = null;

      // Recommendation 8: Mark that an update just happened so we can show changelog
      sessionStorage.setItem('justUpdated', 'true');

      // Save scroll position before reload
      sessionStorage.setItem('scrollPosition', window.scrollY.toString());
      sessionStorage.setItem('scrollPath', window.location.pathname);

      // Create a loading overlay for visual feedback
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999999999999999999;
        opacity: 0;
        transition: opacity 200ms ease-in;
      `;

      overlay.innerHTML = `
        <div style="
          background: white;
          padding: 24px 32px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #0073de;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "></div>
          <div style="
            font-size: 16px;
            font-weight: 600;
            color: #20202b;
          ">Updating app...</div>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;

      document.body.appendChild(overlay);

      // Trigger fade-in of overlay
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });

      // Add smooth fade-out animation to make transition feel intentional
      document.body.style.opacity = '0.8';
      document.body.style.pointerEvents = 'none';
      document.body.style.transition = 'opacity 300ms ease-out';

      // Add a small delay to allow:
      // 1. Service worker to fully settle
      // 2. Fade animation to complete
      // 3. User to see the loading state
      // Use cache-aware reload to ensure fresh content after SW update
      hardReload(350); // Reduced from 500ms since fade takes 300ms
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    // DEBUG: Listen for simulated controller change
    window.addEventListener(
      'sw-controllerchange-debug',
      handleControllerChange
    );

    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      window.removeEventListener('sw-update-trigger', handleUpdateTrigger);
      window.removeEventListener(
        'sw-update-available',
        handleSimulatedUpdateAvailable
      );
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(
        'sw-controllerchange-debug',
        handleControllerChange
      );

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener(
          'message',
          handleServiceWorkerMessage
        );
      }
    };
  }, []);

  return null;
}
