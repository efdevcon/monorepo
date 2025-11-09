/**
 * Utility for cache-aware page reloads
 * 
 * This ensures that after service worker updates, the page reloads with fresh content
 * by clearing all service worker caches before performing the reload.
 */

/**
 * Performs a cache-aware hard reload of the page
 * 
 * Clears all service worker caches before reloading to ensure fresh content
 * is loaded, especially important after service worker updates.
 * 
 * @param delay - Optional delay in milliseconds before reload (default: 100ms)
 * 
 * @example
 * // Simple reload
 * await hardReload();
 * 
 * @example
 * // Reload with custom delay
 * await hardReload(500);
 */
export async function hardReload(delay: number = 100): Promise<void> {
  try {
    // Clear all service worker caches to ensure fresh content
    if ('caches' in window) {
      console.log('🔄 Clearing service worker caches before reload...');
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      console.log('✅ Service worker caches cleared');
    }

    // Small delay to ensure cache clearing completes
    setTimeout(() => {
      // Use window.location.href for hard reload (better than .reload())
      // This ensures browser re-fetches everything including service worker
      window.location.href = window.location.href;
    }, delay);
  } catch (err) {
    console.error('Error during cache-aware reload:', err);
    // Fallback to simple hard reload if cache clearing fails
    window.location.href = window.location.href;
  }
}

/**
 * Performs a cache-aware reload using Next.js router + hard reload
 * 
 * This is useful when you want to refresh Next.js state first, then do a hard reload.
 * Clears service worker caches, calls router.refresh(), then hard reloads.
 * 
 * @param router - Next.js router instance from useRouter()
 * @param delay - Optional delay in milliseconds before reload (default: 100ms)
 * 
 * @example
 * import { useRouter } from 'next/navigation';
 * import { hardReloadWithRouter } from '@/utils/reload';
 * 
 * const MyComponent = () => {
 *   const router = useRouter();
 *   
 *   const handleReset = async () => {
 *     await hardReloadWithRouter(router);
 *   };
 * };
 */
export async function hardReloadWithRouter(
  router: { refresh: () => void },
  delay: number = 100
): Promise<void> {
  try {
    // Clear all service worker caches to ensure fresh content
    if ('caches' in window) {
      console.log('🔄 Clearing service worker caches before reload...');
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      console.log('✅ Service worker caches cleared');
    }

    // Use Next.js router for proper cache-busting reload
    router.refresh();

    // Small delay to ensure router refresh completes
    setTimeout(() => {
      // Hard reload as fallback to ensure everything is fresh
      window.location.href = window.location.href;
    }, delay);
  } catch (err) {
    console.error('Error during cache-aware reload:', err);
    // Fallback to hard reload
    window.location.href = window.location.href;
  }
}

