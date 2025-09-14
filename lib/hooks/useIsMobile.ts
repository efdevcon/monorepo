import { useState, useEffect } from 'react';

export function useIsMobile(width = 768) {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    // Tailwind's md breakpoint is 768px
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < width);
    };

    // Check on mount
    checkIsMobile();

    // Add event listener
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}