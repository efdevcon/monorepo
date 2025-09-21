import { useState, useEffect } from 'react';

export function useIsMobile(width = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Use matchMedia for better performance and reliability
    const mediaQuery = window.matchMedia(`(max-width: ${width - 1}px)`);

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Define handler
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Modern browsers support addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [width]);

  return isMobile;
}