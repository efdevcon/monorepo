"use client";

import { trackAppRouter } from "@socialgouv/matomo-next";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Same Matomo instance as devcon.org and the old app. Site 38 is
// app.devcon.org, which this app takes over when the domain moves. Set
// NEXT_PUBLIC_MATOMO_SITE_ID to an empty string to turn tracking off for a
// deploy context (previews build with NODE_ENV=production too).
const MATOMO_URL = "https://ethereumfoundation.matomo.cloud";
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "38";

/**
 * Page-view tracking for the App Router: one page view per pathname + query
 * change. The tracked URL is built from those two only, never `location.hash`,
 * which matters here because the install bridge lands on
 * `/ticket#access_token=…`. Heatmaps and session recording stay off: the
 * ticket page renders QR secrets. Offline, the tracker script simply fails to
 * load and the queued calls go nowhere; nothing in the app waits on it.
 *
 * Must be rendered inside a Suspense boundary (useSearchParams).
 */
export function MatomoAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !MATOMO_SITE_ID) return;
    trackAppRouter({
      url: MATOMO_URL,
      siteId: MATOMO_SITE_ID,
      pathname,
      searchParams,
      enableHeartBeatTimer: true,
    });
  }, [pathname, searchParams]);

  return null;
}
