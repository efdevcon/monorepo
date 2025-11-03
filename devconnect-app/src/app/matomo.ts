'use client';

import { trackAppRouter } from '@socialgouv/matomo-next';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const MATOMO_URL =
  process.env.NEXT_PUBLIC_MATOMO_URL ||
  'https://ethereumfoundation.matomo.cloud';
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID || '41';

export function MatomoAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackAppRouter({
      url: MATOMO_URL,
      siteId: MATOMO_SITE_ID,
      pathname,
      searchParams, // Pass URLSearchParams object directly
      // Optional: Enable additional features
      enableHeatmapSessionRecording: true,
      enableHeartBeatTimer: true,
    });
  }, [pathname, searchParams]);

  return null;
}
